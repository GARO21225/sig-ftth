"""
export.py — Routes FastAPI d'export de données SIG FTTH
Formats : CSV, Excel, GeoJSON, Shapefile
Filtres : type, etat, zone, date
Permissions : selon rôle JWT
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from typing import Optional
import io
import json
import zipfile
import csv
import tempfile
import os
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_role

router = APIRouter()

# ─────────────────────────────────────────────
# Rôles autorisés à exporter
# ─────────────────────────────────────────────
ROLES_EXPORT = ('admin', 'chef_projet', 'analyste', 'technicien')


def _check_export_permission(current_user: dict):
    if current_user.get('role') not in ROLES_EXPORT:
        raise HTTPException(
            status_code=403,
            detail="Export non autorisé pour votre rôle"
        )


# ─────────────────────────────────────────────
# Requêtes SQL communes
# ─────────────────────────────────────────────
def _build_where(
    type_element: Optional[str],
    etat: Optional[str],
    date_debut: Optional[str],
    date_fin: Optional[str],
) -> tuple[str, list]:
    """Construit la clause WHERE et ses paramètres."""
    conditions = []
    params = []

    if type_element:
        conditions.append("type_noeud = $" + str(len(params) + 1))
        params.append(type_element)
    if etat:
        conditions.append("etat = $" + str(len(params) + 1))
        params.append(etat)
    if date_debut:
        conditions.append(
            "date_creation >= $" + str(len(params) + 1)
        )
        params.append(date_debut)
    if date_fin:
        conditions.append(
            "date_creation <= $" + str(len(params) + 1)
        )
        params.append(date_fin)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    return where, params


async def _fetch_noeuds(
    db,
    type_element: Optional[str],
    etat: Optional[str],
    date_debut: Optional[str],
    date_fin: Optional[str],
):
    where, params = _build_where(
        type_element, etat, date_debut, date_fin
    )
    rows = await db.fetch(f"""
        SELECT
            nom_unique, type_noeud,
            ST_Y(geom) AS latitude,
            ST_X(geom) AS longitude,
            capacite_fibres_max, fibres_utilisees,
            nb_ports, ports_utilises,
            marque, modele, etat,
            date_pose,
            date_creation::text AS date_creation,
            commentaire
        FROM noeud_telecom
        {where}
        ORDER BY nom_unique
    """, *params)
    return [dict(r) for r in rows]


async def _fetch_liens(
    db,
    etat: Optional[str],
    date_debut: Optional[str],
    date_fin: Optional[str],
):
    conditions = []
    params = []
    if etat:
        conditions.append("etat = $" + str(len(params) + 1))
        params.append(etat)
    if date_debut:
        conditions.append(
            "date_creation >= $" + str(len(params) + 1)
        )
        params.append(date_debut)
    if date_fin:
        conditions.append(
            "date_creation <= $" + str(len(params) + 1)
        )
        params.append(date_fin)
    where = (
        "WHERE " + " AND ".join(conditions)
    ) if conditions else ""

    rows = await db.fetch(f"""
        SELECT
            nom_unique, type_cable,
            nb_fibres, fibres_utilisees,
            longueur_m, etat,
            nd.nom_unique AS noeud_depart,
            na.nom_unique AS noeud_arrivee,
            ST_AsGeoJSON(geom)::json AS geom,
            date_creation::text AS date_creation
        FROM lien_telecom lt
        LEFT JOIN noeud_telecom nd
            ON lt.id_noeud_depart = nd.id
        LEFT JOIN noeud_telecom na
            ON lt.id_noeud_arrivee = na.id
        {where}
        ORDER BY nom_unique
    """, *params)
    return [dict(r) for r in rows]


# ─────────────────────────────────────────────
# EXPORT CSV — noeuds télécom
# ─────────────────────────────────────────────
@router.get(
    "/export/csv/noeuds",
    summary="Export CSV des nœuds télécom"
)
async def export_csv_noeuds(
    type_element: Optional[str] = Query(
        None, description="NRO, SRO, PBO, PTO, PM, CLIENT"
    ),
    etat: Optional[str] = Query(
        None, description="actif, inactif, en_travaux…"
    ),
    date_debut: Optional[str] = Query(
        None, description="YYYY-MM-DD"
    ),
    date_fin: Optional[str] = Query(
        None, description="YYYY-MM-DD"
    ),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _check_export_permission(current_user)

    rows = await _fetch_noeuds(
        db, type_element, etat, date_debut, date_fin
    )
    if not rows:
        raise HTTPException(404, "Aucune donnée à exporter")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)

    filename = (
        f"noeuds_telecom_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    )
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


# ─────────────────────────────────────────────
# EXPORT CSV — liens télécom
# ─────────────────────────────────────────────
@router.get(
    "/export/csv/liens",
    summary="Export CSV des liens télécom"
)
async def export_csv_liens(
    etat: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _check_export_permission(current_user)

    rows = await _fetch_liens(db, etat, date_debut, date_fin)
    if not rows:
        raise HTTPException(404, "Aucune donnée à exporter")

    # Enlever geom pour CSV (pas lisible)
    clean = [{k: v for k, v in r.items() if k != 'geom'}
             for r in rows]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=clean[0].keys())
    writer.writeheader()
    writer.writerows(clean)
    output.seek(0)

    filename = (
        f"liens_telecom_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    )
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


# ─────────────────────────────────────────────
# EXPORT EXCEL
# ─────────────────────────────────────────────
@router.get(
    "/export/excel",
    summary="Export Excel multi-feuilles (noeuds + liens)"
)
async def export_excel(
    type_element: Optional[str] = Query(None),
    etat: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _check_export_permission(current_user)

    try:
        import openpyxl
        from openpyxl.styles import (
            Font, PatternFill, Alignment, Border, Side
        )
        from openpyxl.utils import get_column_letter
    except ImportError:
        raise HTTPException(
            500,
            "Module openpyxl manquant. "
            "Installer avec: pip install openpyxl"
        )

    noeuds = await _fetch_noeuds(
        db, type_element, etat, date_debut, date_fin
    )
    liens_raw = await _fetch_liens(
        db, etat, date_debut, date_fin
    )
    liens = [{k: v for k, v in r.items() if k != 'geom'}
             for r in liens_raw]

    wb = openpyxl.Workbook()

    # ── Styles ──────────────────────────────
    header_fill = PatternFill(
        start_color="1D4ED8", end_color="1D4ED8",
        fill_type="solid"
    )
    header_font = Font(
        bold=True, color="FFFFFF", size=11
    )
    alt_fill = PatternFill(
        start_color="EFF6FF", end_color="EFF6FF",
        fill_type="solid"
    )
    thin = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB'),
    )
    center = Alignment(horizontal='center', vertical='center')

    def _write_sheet(ws, data: list[dict], title: str):
        ws.title = title
        if not data:
            ws.append(["Aucune donnée"])
            return
        headers = list(data[0].keys())
        ws.append(headers)
        # Style entêtes
        for col_idx, _ in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center
            cell.border = thin
        # Données
        for row_idx, row in enumerate(data, 2):
            ws.append(list(row.values()))
            fill = alt_fill if row_idx % 2 == 0 else None
            for col_idx in range(1, len(headers) + 1):
                cell = ws.cell(row=row_idx, column=col_idx)
                if fill:
                    cell.fill = fill
                cell.border = thin
        # Largeur auto
        for col_idx, header in enumerate(headers, 1):
            max_len = max(
                len(str(header)),
                max(
                    (len(str(row.get(header, '') or ''))
                     for row in data),
                    default=0
                )
            )
            ws.column_dimensions[
                get_column_letter(col_idx)
            ].width = min(max_len + 4, 40)
        # Freeze header
        ws.freeze_panes = "A2"

    # Feuille 1 : Nœuds
    ws1 = wb.active
    _write_sheet(ws1, noeuds, "Nœuds Télécom")

    # Feuille 2 : Liens
    ws2 = wb.create_sheet()
    _write_sheet(ws2, liens, "Liens Télécom")

    # Feuille 3 : Résumé
    ws3 = wb.create_sheet("Résumé")
    ws3.append(["Indicateur", "Valeur"])
    ws3.append(["Date export", datetime.now().strftime('%d/%m/%Y %H:%M')])
    ws3.append(["Exporté par", current_user.get('email', '—')])
    ws3.append(["Nombre nœuds", len(noeuds)])
    ws3.append(["Nombre liens", len(liens)])
    if noeuds:
        actifs = sum(1 for n in noeuds if n.get('etat') == 'actif')
        ws3.append(["Nœuds actifs", actifs])
    for cell in ws3['A']:
        cell.font = Font(bold=True)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = (
        f"sig_ftth_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    )
    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument"
            ".spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


# ─────────────────────────────────────────────
# EXPORT GEOJSON
# ─────────────────────────────────────────────
@router.get(
    "/export/geojson/noeuds",
    summary="Export GeoJSON des nœuds télécom"
)
async def export_geojson_noeuds(
    type_element: Optional[str] = Query(None),
    etat: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _check_export_permission(current_user)

    where, params = _build_where(
        type_element, etat, date_debut, date_fin
    )
    rows = await db.fetch(f"""
        SELECT
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(geom)::json,
                'properties', json_build_object(
                    'id', id::text,
                    'nom_unique', nom_unique,
                    'type_noeud', type_noeud,
                    'etat', etat,
                    'capacite_fibres_max', capacite_fibres_max,
                    'fibres_utilisees', fibres_utilisees,
                    'marque', marque,
                    'modele', modele,
                    'date_creation', date_creation::text
                )
            ) AS feature
        FROM noeud_telecom
        {where}
    """, *params)

    fc = {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": "EPSG:4326"}
        },
        "features": [dict(r)['feature'] for r in rows]
    }

    filename = (
        f"noeuds_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    )
    return StreamingResponse(
        iter([json.dumps(fc, ensure_ascii=False, indent=2)]),
        media_type="application/geo+json",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


@router.get(
    "/export/geojson/liens",
    summary="Export GeoJSON des liens télécom"
)
async def export_geojson_liens(
    etat: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _check_export_permission(current_user)

    conditions = []
    params = []
    if etat:
        conditions.append("lt.etat = $" + str(len(params) + 1))
        params.append(etat)
    if date_debut:
        conditions.append(
            "lt.date_creation >= $" + str(len(params) + 1)
        )
        params.append(date_debut)
    if date_fin:
        conditions.append(
            "lt.date_creation <= $" + str(len(params) + 1)
        )
        params.append(date_fin)
    where = (
        "WHERE " + " AND ".join(conditions)
    ) if conditions else ""

    rows = await db.fetch(f"""
        SELECT
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(lt.geom)::json,
                'properties', json_build_object(
                    'id', lt.id::text,
                    'nom_unique', lt.nom_unique,
                    'type_cable', lt.type_cable,
                    'nb_fibres', lt.nb_fibres,
                    'fibres_utilisees', lt.fibres_utilisees,
                    'longueur_m', lt.longueur_m,
                    'etat', lt.etat,
                    'noeud_depart', nd.nom_unique,
                    'noeud_arrivee', na.nom_unique
                )
            ) AS feature
        FROM lien_telecom lt
        LEFT JOIN noeud_telecom nd ON lt.id_noeud_depart = nd.id
        LEFT JOIN noeud_telecom na ON lt.id_noeud_arrivee = na.id
        {where}
    """, *params)

    fc = {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": "EPSG:4326"}
        },
        "features": [dict(r)['feature'] for r in rows]
    }

    filename = (
        f"liens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    )
    return StreamingResponse(
        iter([json.dumps(fc, ensure_ascii=False, indent=2)]),
        media_type="application/geo+json",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


# ─────────────────────────────────────────────
# EXPORT SHAPEFILE
# ─────────────────────────────────────────────
@router.get(
    "/export/shapefile/noeuds",
    summary="Export Shapefile des nœuds (ZIP)"
)
async def export_shapefile_noeuds(
    type_element: Optional[str] = Query(None),
    etat: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _check_export_permission(current_user)

    try:
        import geopandas as gpd
        import shapely.geometry as shp
    except ImportError:
        raise HTTPException(
            500,
            "Modules geopandas/shapely manquants. "
            "Installer avec: pip install geopandas"
        )

    rows = await _fetch_noeuds(
        db, type_element, etat, date_debut, date_fin
    )
    if not rows:
        raise HTTPException(404, "Aucune donnée à exporter")

    # Construire GeoDataFrame
    geometries = [
        shp.Point(r['longitude'], r['latitude'])
        for r in rows
    ]
    props = [
        {k: v for k, v in r.items()
         if k not in ('latitude', 'longitude')}
        for r in rows
    ]
    gdf = gpd.GeoDataFrame(props, geometry=geometries, crs="EPSG:4326")

    # Écrire dans tempdir
    with tempfile.TemporaryDirectory() as tmpdir:
        shp_base = os.path.join(tmpdir, "noeuds_telecom")
        gdf.to_file(shp_base + ".shp", driver="ESRI Shapefile")

        # Zipper les composants .shp .shx .dbf .prj
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for ext in ('.shp', '.shx', '.dbf', '.prj', '.cpg'):
                fp = shp_base + ext
                if os.path.exists(fp):
                    zf.write(fp, arcname="noeuds_telecom" + ext)
        zip_buf.seek(0)

    filename = (
        f"noeuds_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    )
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


@router.get(
    "/export/shapefile/liens",
    summary="Export Shapefile des liens (ZIP)"
)
async def export_shapefile_liens(
    etat: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _check_export_permission(current_user)

    try:
        import geopandas as gpd
        import shapely.geometry as shp
    except ImportError:
        raise HTTPException(
            500,
            "Modules geopandas/shapely manquants."
        )

    rows = await _fetch_liens(db, etat, date_debut, date_fin)
    if not rows:
        raise HTTPException(404, "Aucune donnée à exporter")

    geometries = []
    for r in rows:
        if r.get('geom') and r['geom'].get('coordinates'):
            coords = r['geom']['coordinates']
            geometries.append(
                shp.LineString([(c[0], c[1]) for c in coords])
            )
        else:
            geometries.append(None)

    props = [
        {k: v for k, v in r.items() if k != 'geom'}
        for r in rows
    ]
    gdf = gpd.GeoDataFrame(
        props, geometry=geometries, crs="EPSG:4326"
    )
    gdf = gdf[gdf.geometry.notna()]

    with tempfile.TemporaryDirectory() as tmpdir:
        shp_base = os.path.join(tmpdir, "liens_telecom")
        gdf.to_file(shp_base + ".shp", driver="ESRI Shapefile")

        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for ext in ('.shp', '.shx', '.dbf', '.prj', '.cpg'):
                fp = shp_base + ext
                if os.path.exists(fp):
                    zf.write(fp, arcname="liens_telecom" + ext)
        zip_buf.seek(0)

    filename = (
        f"liens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    )
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


# ─────────────────────────────────────────────
# Route de résumé des exports disponibles
# ─────────────────────────────────────────────
@router.get(
    "/export",
    summary="Liste des formats d'export disponibles"
)
async def list_exports(
    current_user: dict = Depends(get_current_user),
):
    _check_export_permission(current_user)
    return {
        "formats": [
            {
                "format": "CSV",
                "routes": [
                    "/api/v1/export/csv/noeuds",
                    "/api/v1/export/csv/liens",
                ],
                "params": [
                    "type_element", "etat",
                    "date_debut", "date_fin"
                ],
            },
            {
                "format": "Excel",
                "routes": ["/api/v1/export/excel"],
                "description": "Multi-feuilles : noeuds + liens + résumé",
            },
            {
                "format": "GeoJSON",
                "routes": [
                    "/api/v1/export/geojson/noeuds",
                    "/api/v1/export/geojson/liens",
                ],
                "crs": "EPSG:4326",
            },
            {
                "format": "Shapefile",
                "routes": [
                    "/api/v1/export/shapefile/noeuds",
                    "/api/v1/export/shapefile/liens",
                ],
                "note": "Retourné en ZIP (shp + shx + dbf + prj)",
            },
        ]
    }
