FROM python:3.8.5

WORKDIR /app

COPY Pipfile /app/Pipfile
COPY Pipfile.lock /app/Pipfile.lock

RUN pip install --upgrade pip && \
    pip install pipenv && \
    pipenv install --system --deploy

COPY . /app

ENV FLASK_APP main.py
ENV FLASK_RUN_HOST 0.0.0.0

CMD ["flask", "run"]
