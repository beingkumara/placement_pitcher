import unittest
from services.email_service import strip_quoted_text

class TestEmailParsing(unittest.TestCase):
    def test_strip_basic_on_wrote(self):
        body = """
Hello,

Yes, we are interested.

On Sat, Jan 10, 2026 at 9:35 PM <kumartteja12345@gmail.com> wrote:
> Dear Mr. Pichai,
>
> My name is [Your Name]...
"""
        clean = strip_quoted_text(body).strip()
        expected = "Hello,\n\nYes, we are interested."
        self.assertEqual(clean, expected)

    def test_strip_gmail_quote(self):
        body = """
Sounds good.

On 2026-01-10 14:00, John Doe wrote:
> Old message content
"""
        clean = strip_quoted_text(body).strip()
        self.assertEqual(clean, "Sounds good.")

    def test_strip_original_message(self):
        body = """
Confirmed.

-----Original Message-----
From: Me
Sent: ...
"""
        clean = strip_quoted_text(body).strip()
        self.assertEqual(clean, "Confirmed.")

    def test_no_quote(self):
        body = "Just a simple message."
        clean = strip_quoted_text(body).strip()
        self.assertEqual(clean, "Just a simple message.")

if __name__ == "__main__":
    unittest.main()
