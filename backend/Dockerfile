FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# venv in the image — PATH above ensures `manage.py`/`gunicorn` resolve
RUN python -m venv /app/.venv

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data /app/media \
    && chmod +x /app/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]