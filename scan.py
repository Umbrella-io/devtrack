import os
import re

def check_files(directory):
    target_regex = re.compile(r'<(a|Link)[^>]+target=["\']_blank["\'][^>]*>', re.IGNORECASE)
    
    found_any = False
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    for match in target_regex.finditer(content):
                        tag = match.group(0)
                        if 'rel=' not in tag or ('noopener' not in tag and 'noreferrer' not in tag):
                            print(f"File: {filepath}")
                            print(f"Tag: {tag}")
                            print("-" * 40)
                            found_any = True
                except Exception as e:
                    pass

    if not found_any:
        print("NO VULNERABILITIES FOUND.")

check_files('src')
