import re

def refactor():
    with open("backend/storage/supabase_provider.py", "r", encoding="utf-8") as f:
        content = f.read()

    # We match the pattern of a for loop that ends with an upsert.execute()
    # It looks like:
    #         for x in (data.get("something") or []):
    #             ... lines of code ...
    #             sb.table("table").upsert(expr).execute()
    
    # We will find `def save(self, data: dict) -> None:`
    # and re-write the loops inside it.
    
    methods = re.split(r'(def save\(self, data[^:]+:\s*\n)', content)
    
    new_content = [methods[0]]
    for i in range(1, len(methods), 2):
        signature = methods[i]
        body = methods[i+1]
        
        # Next method or class definition
        end_idx = re.search(r'\n\s*(def |class |@staticmethod)', body)
        if end_idx:
            e_idx = end_idx.start()
            method_body = body[:e_idx]
            rest = body[e_idx:]
        else:
            method_body = body
            rest = ""
            
        # Refactor method_body
        # Find FOR loop:
        for_match = re.search(r'(\s+)for\s+(\w+)\s+in\s+\((.*?)\):\n(.*?)sb\.table\("([^"]+)"\)\.upsert\((.*?)\)\.execute\(\)\n', method_body, re.DOTALL)
        
        if for_match:
            indent = for_match.group(1)
            var_name = for_match.group(2)
            iterable = for_match.group(3)
            loop_body = for_match.group(4)
            table_name = for_match.group(5)
            upsert_expr = for_match.group(6)
            
            # Rewrite it:
            new_code = f"""{indent}rows_to_upsert = []
{indent}for {var_name} in ({iterable}):
{loop_body}    rows_to_upsert.append({upsert_expr})
{indent}if rows_to_upsert:
{indent}    try:
{indent}        for idx in range(0, len(rows_to_upsert), 50):
{indent}            sb.table("{table_name}").upsert(rows_to_upsert[idx:idx+50]).execute()
{indent}    except Exception:
{indent}        pass  # or raise, but we keep it simple or let the caller handle
\n"""
            # Wait, some loops have `try/except` around the execute.
            # Let's just do a string replacement for the loop part.
            
            # Actually, doing this via AST or safe regex is complex because loop_body can contain anything.
            pass
            
            
if __name__ == "__main__":
    refactor()
