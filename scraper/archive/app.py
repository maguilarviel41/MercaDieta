import tkinter as tk
from tkinter import ttk, messagebox
import threading
import requests
import json
import csv
import os
from datetime import datetime

DB_FILE = "productos.json"
CACHE_FILE = "categorias_cache.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "Accept": "application/json",
}
BASE = "https://tienda.mercadona.es/api"

def get_categories():
    resp = requests.get(f"{BASE}/categories/", headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()

def get_category_products(cat_id):
    resp = requests.get(f"{BASE}/categories/{cat_id}/", headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    products = []
    for sub in data.get("categories", []):
        products.extend(sub.get("products", []))
    return products

def parse_product(p):
    nutrition = p.get("nutrition", {})
    info = p.get("price_instructions", {})
    return {
        "id": str(p.get("id", "")),
        "name": p.get("display_name", p.get("name", "")),
        "brand": p.get("brand") or "Hacendado",
        "price": info.get("unit_price", ""),
        "unit": info.get("size_format", ""),
        "kcal": _get_nutrient(nutrition, ["energia_kcal", "energy-kcal", "energia"]),
        "protein": _get_nutrient(nutrition, ["proteinas", "proteins", "protein"]),
        "carbs": _get_nutrient(nutrition, ["hidratos", "carbohydrates", "carbohidratos"]),
        "fat": _get_nutrient(nutrition, ["grasas", "fat", "lipids"]),
        "fiber": _get_nutrient(nutrition, ["fibra", "fiber", "fibra_alimentaria"]),
        "salt": _get_nutrient(nutrition, ["sal", "salt", "sodio"]),
    }

def _get_nutrient(nutrition, keys):
    for k in keys:
        if k in nutrition:
            val = nutrition[k]
            if isinstance(val, dict):
                val = val.get("amount", val.get("value", ""))
            if val not in (None, "", "NaN"):
                try:
                    return str(round(float(val), 1))
                except (ValueError, TypeError):
                    return str(val)
    return ""

def search_in_cache(query, all_products):
    q = query.lower().strip()
    results = []
    for p in all_products:
        name = p.get("name", "").lower()
        brand = p.get("brand", "").lower()
        if q in name or q in brand:
            results.append(p)
    return results[:15]

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_cache(products):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False)

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_db(db):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

def export_csv(db):
    filename = f"mercadona_macros_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["name","brand","kcal","protein","carbs","fat","fiber","salt","price","unit"])
        writer.writeheader()
        writer.writerows(db)
    return filename


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Mercadona Macros")
        self.geometry("920x700")
        self.resizable(True, True)
        self.configure(bg="#f5f5f0")

        self.db = load_db()
        self.all_products = load_cache()
        self.search_results = []
        self.cache_loaded = len(self.all_products) > 0

        self._build_ui()
        self._refresh_db_table()

        if not self.cache_loaded:
            self.status_var.set("[!] Catalogo no cargado - pulsa 'Actualizar catalogo' primero")

    def _build_ui(self):
        header = tk.Frame(self, bg="#1a1a1a", padx=16, pady=12)
        header.pack(fill="x")
        tk.Label(header, text="Mercadona Macros", font=("Helvetica", 16, "bold"),
                 bg="#1a1a1a", fg="white").pack(side="left")
        tk.Label(header, text="busca - anade - exporta", font=("Helvetica", 10),
                 bg="#1a1a1a", fg="#888").pack(side="left", padx=12)
        self.cache_lbl = tk.Label(header, text="", font=("Helvetica", 9),
                                  bg="#1a1a1a", fg="#aaa")
        self.cache_lbl.pack(side="right")
        self._update_cache_label()

        search_frame = tk.Frame(self, bg="#f5f5f0", padx=16, pady=10)
        search_frame.pack(fill="x")

        self.search_var = tk.StringVar()
        entry = ttk.Entry(search_frame, textvariable=self.search_var, font=("Helvetica", 12), width=38)
        entry.pack(side="left", ipady=6)
        entry.bind("<Return>", lambda e: self._do_search())
        entry.focus()

        self.search_btn = ttk.Button(search_frame, text="Buscar", command=self._do_search)
        self.search_btn.pack(side="left", padx=8)

        ttk.Button(search_frame, text="Actualizar catalogo",
                   command=self._load_cache_bg).pack(side="left", padx=4)

        self.status_var = tk.StringVar(value="")
        tk.Label(search_frame, textvariable=self.status_var, font=("Helvetica", 10),
                 bg="#f5f5f0", fg="#555").pack(side="left", padx=10)

        paned = tk.PanedWindow(self, orient="vertical", bg="#ccc", sashwidth=5)
        paned.pack(fill="both", expand=True, padx=16, pady=(0, 8))

        res_frame = tk.LabelFrame(paned, text=" Resultados de busqueda ", font=("Helvetica", 10),
                                  bg="#f5f5f0", padx=4, pady=4)
        self.results_tree = self._make_tree(res_frame)
        self.results_tree.pack(fill="both", expand=True)
        ttk.Button(res_frame, text="+ Anadir seleccionado a mi base de datos",
                   command=self._add_selected).pack(pady=(4, 2))
        paned.add(res_frame, height=260)

        db_frame = tk.LabelFrame(paned, text=" Mi base de datos ", font=("Helvetica", 10),
                                 bg="#f5f5f0", padx=4, pady=4)
        self.db_tree = self._make_tree(db_frame)
        self.db_tree.pack(fill="both", expand=True)

        btn_row = tk.Frame(db_frame, bg="#f5f5f0")
        btn_row.pack(pady=(4, 2))
        ttk.Button(btn_row, text="Eliminar seleccionado", command=self._remove_selected).pack(side="left", padx=4)
        ttk.Button(btn_row, text="Exportar CSV", command=self._export).pack(side="left", padx=4)
        self.db_count_var = tk.StringVar()
        tk.Label(btn_row, textvariable=self.db_count_var, bg="#f5f5f0", fg="#666",
                 font=("Helvetica", 10)).pack(side="left", padx=8)
        paned.add(db_frame, height=260)

    def _make_tree(self, parent):
        frame = tk.Frame(parent, bg="#f5f5f0")
        frame.pack(fill="both", expand=True)
        cols = ("Nombre", "Marca", "Kcal", "Prot.", "Carbs", "Grasas", "Fibra", "Precio")
        tree = ttk.Treeview(frame, columns=cols, show="headings", height=8)
        widths = {"Nombre": 270, "Marca": 110}
        for col in cols:
            w = widths.get(col, 70)
            tree.heading(col, text=col)
            tree.column(col, width=w, anchor="center" if col not in widths else "w")
        vsb = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=vsb.set)
        vsb.pack(side="right", fill="y")
        tree.pack(fill="both", expand=True)
        return tree

    def _update_cache_label(self):
        if self.all_products:
            self.cache_lbl.config(text=f"{len(self.all_products)} productos en catalogo")
        else:
            self.cache_lbl.config(text="Sin catalogo local")

    def _load_cache_bg(self):
        self.search_btn.configure(state="disabled")
        self.status_var.set("Descargando catalogo... (puede tardar 1-2 minutos)")
        threading.Thread(target=self._load_cache_thread, daemon=True).start()

    def _load_cache_thread(self):
        try:
            self.after(0, self.status_var.set, "Obteniendo categorias...")
            categories = get_categories()

            leaf_ids = []
            for cat in categories:
                for sub in cat.get("categories", []):
                    for leaf in sub.get("categories", []):
                        leaf_ids.append(leaf["id"])
                    if not sub.get("categories"):
                        leaf_ids.append(sub["id"])

            all_products = []
            total = len(leaf_ids)
            for i, cat_id in enumerate(leaf_ids):
                self.after(0, self.status_var.set,
                           f"Descargando productos... {i+1}/{total} categorias")
                try:
                    prods = get_category_products(cat_id)
                    for p in prods:
                        all_products.append(parse_product(p))
                except Exception:
                    pass

            seen = set()
            unique = []
            for p in all_products:
                if p["id"] not in seen:
                    seen.add(p["id"])
                    unique.append(p)

            self.all_products = unique
            save_cache(unique)
            self.cache_loaded = True
            self.after(0, self._update_cache_label)
            self.after(0, self.status_var.set,
                       f"Catalogo listo: {len(unique)} productos descargados")
        except Exception as e:
            self.after(0, self.status_var.set, f"Error al descargar catalogo: {e}")
        finally:
            self.after(0, lambda: self.search_btn.configure(state="normal"))

    def _do_search(self):
        query = self.search_var.get().strip()
        if not query:
            return
        if not self.all_products:
            self.status_var.set("[!] Primero pulsa 'Actualizar catalogo'")
            return
        results = search_in_cache(query, self.all_products)
        self._show_results(results, query)

    def _show_results(self, results, query):
        self.search_results = results
        self.results_tree.delete(*self.results_tree.get_children())
        if not results:
            self.status_var.set(f"Sin resultados para '{query}'")
            return
        existing_ids = {p["id"] for p in self.db}
        for p in results:
            precio = f"{p['price']} EUR/{p['unit']}" if p.get("price") else ""
            tag = "added" if p["id"] in existing_ids else ""
            self.results_tree.insert("", "end", iid=p["id"], tags=(tag,), values=(
                p["name"], p["brand"],
                p["kcal"], p["protein"], p["carbs"], p["fat"], p["fiber"], precio
            ))
        self.results_tree.tag_configure("added", foreground="#999")
        self.status_var.set(f"{len(results)} resultado(s) para '{query}'")

    def _add_selected(self):
        sel = self.results_tree.selection()
        if not sel:
            messagebox.showinfo("Selecciona un producto", "Haz clic en un producto antes de anadir.")
            return
        existing_ids = {p["id"] for p in self.db}
        added = 0
        for iid in sel:
            p = next((x for x in self.search_results if x["id"] == iid), None)
            if p and p["id"] not in existing_ids:
                self.db.append(p)
                added += 1
        if added:
            save_db(self.db)
            self._refresh_db_table()
            self.status_var.set(f"{added} producto(s) anadido(s)")
        else:
            self.status_var.set("Ese producto ya esta en tu base de datos")

    def _remove_selected(self):
        sel = self.db_tree.selection()
        if not sel:
            return
        ids = set(sel)
        self.db = [p for p in self.db if p["id"] not in ids]
        save_db(self.db)
        self._refresh_db_table()
        self.status_var.set(f"{len(ids)} producto(s) eliminado(s)")

    def _refresh_db_table(self):
        self.db_tree.delete(*self.db_tree.get_children())
        for p in self.db:
            precio = f"{p.get('price','')} EUR/{p.get('unit','')}" if p.get("price") else ""
            self.db_tree.insert("", "end", iid=p["id"], values=(
                p["name"], p["brand"],
                p["kcal"], p["protein"], p["carbs"], p["fat"], p["fiber"], precio
            ))
        count = len(self.db)
        self.db_count_var.set(f"{count} producto(s)" if count else "")

    def _export(self):
        if not self.db:
            messagebox.showinfo("Base de datos vacia", "Anade productos primero.")
            return
        filename = export_csv(self.db)
        messagebox.showinfo("Exportado", f"Archivo guardado:\n{filename}")
        self.status_var.set(f"Exportado: {filename}")


if __name__ == "__main__":
    app = App()
    app.mainloop()
