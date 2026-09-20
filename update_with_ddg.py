import json
import urllib.parse
from duckduckgo_search import DDGS
import time
import re

from generate_themes import get_theme_data

def generate_ts():
    data = get_theme_data()
    ddgs = DDGS()
    
    # Pre-define a fallback image just in case
    fallback = "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=800&q=80"
    
    for theme in data:
        for rep in theme["repertories"]:
            prompt = rep["image"]
            
            # The prompt is something like "Brazilian constitution law book on wooden table"
            print(f"Searching for: {prompt}")
            
            try:
                results = list(ddgs.images(prompt, max_results=1))
                if results:
                    rep["image"] = results[0]["image"]
                else:
                    rep["image"] = fallback
            except Exception as e:
                print(f"Error fetching {prompt}: {e}")
                rep["image"] = fallback
                
            time.sleep(1) # Be nice to DDG

    out = "export const dailyThemes = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n"
    with open("c:/Users/davif/Desktop/redação/reda-o-nota-mil/src/data/themes.ts", "w", encoding="utf-8") as f:
        f.write(out)

if __name__ == "__main__":
    generate_ts()
