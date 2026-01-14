import sqlite3

def migrate():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    columns_to_add = [
        ("phone", "VARCHAR"),
        ("phone_numbers", "TEXT"),
        ("linkedin", "VARCHAR"),
        ("additional_emails", "TEXT"),
        ("created_by_id", "INTEGER REFERENCES users(id)")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE contacts ADD COLUMN {col_name} {col_type}")
            print(f"Successfully added {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"Column {col_name} already exists, skipping.")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
