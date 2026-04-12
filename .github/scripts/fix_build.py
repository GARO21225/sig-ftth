#!/usr/bin/env python3
"""
Script de correction pré-build — appelé par deploy.yml
"""
import sys, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'pages')

def fix_import_dwg():
    path = os.path.join(ROOT, 'ImportDWGPage.tsx')
    if not os.path.exists(path):
        print(f"[SKIP] {path} not found"); return

    with open(path) as f:
        lines = f.readlines()

    # Find all lines with const STATUT_COLOR
    decl_lines = [i for i, l in enumerate(lines) if 'const STATUT_COLOR' in l]
    print(f"[ImportDWGPage] STATUT_COLOR at lines: {[i+1 for i in decl_lines]}")

    if len(decl_lines) <= 1:
        print("[ImportDWGPage] OK - no duplicate"); return

    # Keep first, remove all others and their blocks (next ~5 lines)
    lines_to_remove = set()
    for idx in decl_lines[1:]:  # skip first occurrence
        # Remove from this line to the closing } of the block
        j = idx
        while j < len(lines):
            lines_to_remove.add(j)
            stripped = lines[j].strip()
            if stripped == '}' or stripped == '};':
                break
            j += 1
            if j > idx + 10: break  # safety

    print(f"[ImportDWGPage] Removing lines: {sorted([i+1 for i in lines_to_remove])}")
    fixed_lines = [l for i, l in enumerate(lines) if i not in lines_to_remove]

    # Ensure first STATUT_COLOR is at module level
    content = ''.join(fixed_lines)
    first_decl = content.find('const STATUT_COLOR')
    comp_start = content.find('export default function ImportDWGPage')

    if first_decl > comp_start:
        # Still inside component — move to module level
        content = re.sub(
            r'\n[ \t]+const STATUT_COLOR.*?\n[ \t]+\}',
            '', content, flags=re.DOTALL
        )
        module_decl = (
            "\nconst STATUT_COLOR: Record<string, string> = {\n"
            "  integre: 'text-green-400',\n  valide: 'text-blue-400',\n"
            "  rejete: 'text-red-400',\n  en_cours: 'text-yellow-400',\n"
            "  echec: 'text-red-400',\n  warning: 'text-orange-400',\n}\n\n"
        )
        content = content.replace(
            'export default function ImportDWGPage',
            module_decl + 'export default function ImportDWGPage', 1
        )

    remaining = content.count('const STATUT_COLOR')
    print(f"[ImportDWGPage] Remaining: {remaining}")


    # Also fix trailing extra closing brace
    lines = content.split('\n')
    while len(lines) >= 3 and lines[-1] == '' and lines[-2] == '}' and lines[-3] == '' and lines[-4] == '}':
        print("[ImportDWGPage] Removing extra trailing }")
        lines = lines[:-2]
    content = '\n'.join(lines)
    if not content.endswith('\n'):
        content += '\n'

    with open(path, 'w') as f:
        f.write(content)
    print("[ImportDWGPage] FIXED ✓")


def fix_mappage():
    path = os.path.join(ROOT, 'MapPage.tsx')
    if not os.path.exists(path):
        print(f"[SKIP] {path} not found"); return

    with open(path) as f:
        content = f.read()

    if 'Boutons liens' not in content and ') : (' not in content:
        print("[MapPage] OK - no ternary bug"); return

    print("[MapPage] Ternary bug detected - patching...")

    # Find block boundaries
    markers = [
        "{/* Barre d\u2019\u00e9dition",
        "{/* Barre d'edition",
        "{canEdit && (",
    ]
    start = -1
    for m in markers:
        start = content.find(m)
        if start >= 0: break

    end_marker = "{/* Panneau formulaire de cr"
    end = content.find(end_marker)

    if start < 0 or end < 0:
        print(f"[MapPage] Boundaries not found (start={start}, end={end})"); return

    replacement = (
        "{canEdit && editMode && (\n"
        "        <div className=\"absolute top-20 left-4 z-[1000]\">\n"
        "          <div className=\"bg-amber-900/95 border border-amber-600 rounded-2xl p-3\">\n"
        "            <p className=\"text-xs text-amber-300 mb-2\">Mode creation</p>\n"
        "            <button onClick={annulerEdition} className=\"w-full py-1.5 bg-red-700 text-white text-xs rounded-xl\">Annuler</button>\n"
        "          </div>\n"
        "        </div>\n"
        "      )}\n"
        "      {canEdit && !editMode && (\n"
        "        <div className=\"absolute top-20 left-4 z-[1000] flex flex-col gap-2\">\n"
        "          <div className=\"bg-gray-900/95 border border-gray-700 rounded-2xl p-2 flex flex-col gap-1\">\n"
        "            <button onClick={() => activerEditMode('noeud_telecom')} className=\"px-3 py-2 bg-gray-800 text-gray-300 text-xs rounded-xl\">Noeud telecom</button>\n"
        "            <button onClick={() => activerEditMode('noeud_gc')} className=\"px-3 py-2 bg-gray-800 text-gray-300 text-xs rounded-xl\">Noeud GC</button>\n"
        "          </div>\n"
        "          <div className=\"bg-gray-900/95 border border-gray-700 rounded-2xl p-2 flex flex-col gap-1\">\n"
        "            <button onClick={() => setShowLienForm('lien_telecom')} className=\"px-3 py-2 bg-gray-800 text-gray-300 text-xs rounded-xl\">Lien telecom</button>\n"
        "            <button onClick={() => setShowLienForm('lien_gc')} className=\"px-3 py-2 bg-gray-800 text-gray-300 text-xs rounded-xl\">Lien GC</button>\n"
        "            <button onClick={() => setShowZones(true)} className=\"px-3 py-2 bg-gray-800 text-gray-300 text-xs rounded-xl\">Zones</button>\n"
        "            <button onClick={() => setShowItineraires(true)} className=\"px-3 py-2 bg-gray-800 text-gray-300 text-xs rounded-xl\">Itineraires</button>\n"
        "          </div>\n"
        "        </div>\n"
        "      )}\n\n"
        "      "
    )

    fixed = content[:start] + replacement + content[end:]
    with open(path, 'w') as f:
        f.write(fixed)
    print(f"[MapPage] FIXED ✓ (ternaries remaining: {fixed.count(') : (')})")


if __name__ == '__main__':
    print("=== SIG FTTH pre-build fix script ===")
    fix_import_dwg()
    fix_mappage()
    print("=== Done ===")
    sys.exit(0)
