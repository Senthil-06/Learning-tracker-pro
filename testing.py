import time
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

# WITHOUT pooling
engine_no_pool = create_engine("postgresql://postgres:avis123@localhost:5432/The_big_one", poolclass=NullPool)

start = time.time()
for i in range(10):
    conn = engine_no_pool.connect()
    conn.execute(text("SELECT 1"))
    conn.close()
print(f"Without pool: {time.time() - start:.2f}s")

# WITH pooling (default)
engine_with_pool = create_engine("postgresql://postgres:avis123@localhost:5432/The_big_one")

start = time.time()
for i in range(10):
    conn = engine_with_pool.connect()
    conn.execute(text("SELECT 1"))
    conn.close()
print(f"With pool: {time.time() - start:.2f}s")