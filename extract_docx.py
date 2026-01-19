import zipfile
import xml.etree.ElementTree as ET
import os
import glob

def extract_text_from_docx(docx_path):
    """Extract text from a docx file with proper paragraph handling."""
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            with z.open('word/document.xml') as f:
                tree = ET.parse(f)
                ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
                paragraphs = []
                for p in tree.iter(ns + 'p'):
                    para_texts = []
                    for t in p.iter(ns + 't'):
                        if t.text:
                            para_texts.append(t.text)
                    if para_texts:
                        paragraphs.append(''.join(para_texts))
                return '\n'.join(paragraphs)
    except Exception as e:
        return f"Error reading {docx_path}: {str(e)}"

# Process all docx files and save to individual text files
docx_files = glob.glob("*.docx")
for docx_file in docx_files:
    text = extract_text_from_docx(docx_file)
    output_file = docx_file.replace('.docx', '_content.txt')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Saved: {output_file}")
