import docx
import os

def read_docx(file_path):
    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return '\n'.join(full_text)

file_path = r'c:\Users\sandeep\Downloads\Claudes\Cricket\cricket_ui\Design evaluation_assessment prompts v2 (1).docx'
output_path = r'c:\Users\sandeep\Downloads\Claudes\Cricket\cricket_ui\design_prompts.txt'

if os.path.exists(file_path):
    content = read_docx(file_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Content saved to {output_path}")
else:
    print(f"File not found: {file_path}")
