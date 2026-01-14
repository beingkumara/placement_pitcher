import sqlite3

def migrate():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    columns_to_add = [
        ("invitation_token", "VARCHAR"),
        ("invitation_expires_at", "DATETIME")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"Successfully added {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"Column {col_name} already exists, skipping.")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("Invitation migration completed.")

if __name__ == "__main__":
    migrate()
