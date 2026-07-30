"""
db_layer.py — Capa de acceso a PostgreSQL para cuentas de usuario y
sincronizacion de datos entre dispositivos.

Diseño deliberadamente simple: una sola tabla generica `user_data` que
guarda, por usuario, las mismas claves que hoy vive en localStorage
(profile, goals, week, pantry, recipes, saved_diets, etc.) como JSON.
Esto evita tener que diseñar un esquema relacional completo y migrar
cada pantalla una por una; el resto de la app sigue funcionando igual,
solo cambia de donde "vive" el dato.

Si DATABASE_URL no esta configurada, todas las funciones de este modulo
lanzan RuntimeError de forma controlada — el servidor sigue funcionando
en modo "solo local" (sin cuentas) tal y como ya funcionaba antes.
"""
import os
import secrets
import psycopg2
import psycopg2.extras
import bcrypt
import json


def load_database_url():
    url = os.environ.get('DATABASE_URL')
    if url:
        return url
    try:
        with open('.env') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    return line.strip().split('=', 1)[1]
    except FileNotFoundError:
        pass
    return None


DATABASE_URL = load_database_url()


def get_conn():
    if not DATABASE_URL:
        raise RuntimeError('DATABASE_URL no configurada — cuentas de usuario desactivadas')
    # Render exige SSL en la URL externa; sslmode=require es inofensivo en local tambien.
    return psycopg2.connect(DATABASE_URL, sslmode='require')


def init_db():
    """Crea las tablas si no existen. Seguro de llamar en cada arranque."""
    if not DATABASE_URL:
        print('[db] DATABASE_URL no configurada, cuentas de usuario desactivadas (modo solo local)')
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_data (
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    key TEXT NOT NULL,
                    value JSONB NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    PRIMARY KEY (user_id, key)
                );
            """)
        conn.commit()
    print('[db] Tablas verificadas/creadas correctamente')


# ── Usuarios y sesiones ─────────────────────────────────────────────────────

def create_user(email, password):
    email = email.strip().lower()
    if not email or '@' not in email:
        return {'ok': False, 'error': 'Email invalido'}
    if not password or len(password) < 6:
        return {'ok': False, 'error': 'La contraseña debe tener al menos 6 caracteres'}
    pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
                    (email, pw_hash)
                )
                user_id = cur.fetchone()[0]
            conn.commit()
    except psycopg2.errors.UniqueViolation:
        return {'ok': False, 'error': 'Ya existe una cuenta con ese email'}
    token = create_session(user_id)
    return {'ok': True, 'token': token, 'email': email}


def verify_user(email, password):
    email = email.strip().lower()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, password_hash FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
    if not row:
        return {'ok': False, 'error': 'Email o contraseña incorrectos'}
    user_id, pw_hash = row
    if not bcrypt.checkpw(password.encode('utf-8'), pw_hash.encode('utf-8')):
        return {'ok': False, 'error': 'Email o contraseña incorrectos'}
    token = create_session(user_id)
    return {'ok': True, 'token': token, 'email': email}


def create_session(user_id):
    token = secrets.token_hex(32)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO sessions (token, user_id) VALUES (%s, %s)",
                (token, user_id)
            )
        conn.commit()
    return token


def user_id_from_token(token):
    if not token:
        return None
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM sessions WHERE token = %s", (token,))
            row = cur.fetchone()
    return row[0] if row else None


def delete_session(token):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM sessions WHERE token = %s", (token,))
        conn.commit()


# ── Datos del usuario (sincronizacion) ──────────────────────────────────────

def get_all_data(user_id):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT key, value FROM user_data WHERE user_id = %s", (user_id,))
            rows = cur.fetchall()
    return {key: value for key, value in rows}


def set_data(user_id, key, value):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_data (user_id, key, value, updated_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (user_id, key)
                DO UPDATE SET value = EXCLUDED.value, updated_at = now()
            """, (user_id, key, psycopg2.extras.Json(value)))
        conn.commit()