import psycopg2
import json

URL = "postgresql://postgres:postgres@localhost:5432/postgres" # default, or let's read env vars if we can
# wait, how to get the T20 url? It is in .env.local
