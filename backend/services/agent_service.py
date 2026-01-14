from models import Contact
import os
import google.generativeai as genai
import json
from duckduckgo_search import DDGS

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def research_company(company_name: str) -> str:
    """
    Performs a quick web search to find what the company does.
    """
    print(f"Researching company: {company_name}...")
    try:
        results = DDGS().text(f"{company_name} company what do they do", max_results=2)
        if results:
            summary = "\\n".join([f"- {r['body']}" for r in results])
            return summary
    except Exception as e:
        print(f"Research failed for {company_name}: {e}")
    
    return "No specific research data available."
def generate_pitch_email(contact: Contact) -> dict:
    if not api_key:
        # Fallback if no API key is set
        return {
            "subject": "Missing API Key",
            "body": "Please set GOOGLE_API_KEY in backend/.env to generate valid emails."
        }

    company = contact.company_name
    hr = contact.hr_name or "Hiring Manager"
    context = contact.context or "We have excellent students available for full-time roles."
    
    # perform research
    research_summary = research_company(company)
    print(f"Research Summary for {company}:\n{research_summary}")

    # List of models to try in order of preference/likelihood of free tier availability
    candidate_models = [
        'gemini-2.0-flash-exp',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-flash-latest'
    ]

    # Sort replies by date if needed, though they might come sorted or we just take the last one
    # For now, let's include the most recent reply as context
    reply_context = ""
    task_description = f"Write a professional cold email to {hr} from {company} to pitch IIT Madras students for recruitment."
    
    if contact.replies and len(contact.replies) > 0:
        # Assuming last reply in list is most recent or we sort. 
        # Ideally we should verify sorting, but let's grab the last added one.
        last_reply = contact.replies[-1]
        reply_context = f"""
        Warning: We have already received a reply from this person. 
        
        Recent Reply from {hr}:
        Subject: {last_reply.subject}
        Body: {last_reply.body}
        
        YOUR GOAL is to write a RESPONSE to this reply. 
        Address their points. If they showed interest, provide next steps (sharing brochure, scheduling call).
        If they rejected, write a polite thank you and request to keep in touch for future.
        """
        task_description = f"Write a professional response to the email received from {hr} at {company}."

    prompt = f"""
    You are a Deputy Placement Coordinator at IIT Madras.
    {task_description}
    
    Company Research: 
    {research_summary}

    Specific Context/Instruction: {context}
    
    {reply_context}
    
    The email should be professional, concise, and persuasive.
    Tailor the pitch to the company's domain and specialization based on the research provided.
    Return the response strictly as a JSON object with keys: "subject" and "body".
    Do not include markdown formatting like ```json ... ```. Just the raw JSON string.
    """

    last_exception = None

    for model_name in candidate_models:
        try:
            print(f"Attempting email generation with model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            
            # Attempt to clean potential markdown formatting
            text_response = response.text.strip()
            if text_response.startswith("```json"):
                text_response = text_response[7:]
            if text_response.endswith("```"):
                text_response = text_response[:-3]
                
            return json.loads(text_response)
        except Exception as e:
            print(f"Model {model_name} failed: {e}")
            last_exception = e
            # Continue to next model
            continue

    # If all models fail
    return {
        "subject": "Error Generating Email",
        "body": f"All LLM models failed. Last error: {str(last_exception)}"
    }
