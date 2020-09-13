from flask import Flask, render_template, request, redirect, url_for
from elasticsearch import Elasticsearch
import json
import pandas as pd
import configparser
from datetime import date, timedelta
from wrangle import wrangle

app = Flask(__name__)
wrangle = wrangle()

def get_data():
    config = configparser.ConfigParser()
    config.read('config.ini')

    host = os.environ.get('ELASTICSEARCH_HOST')
    if host is None:
        host = 'https://{}:{}@40ad140d461d810ac41ed710b5c7a5b6.us-west-2.aws.found.io:9243/'.format(
            config['ELASTICSEARCH']['Username'], config['ELASTICSEARCH']['Password'])
    es = Elasticsearch(host)

    # query
    week_ago = date.today() - timedelta(days=7)
    week_ago = week_ago.strftime('%Y-%m-%d')
    raw = es.search(index='', body= {'from': 0, 'size': 10000, 'query': {'bool': {'must': [{'range': {'when_captured': {'gte': week_ago, 'format': 'yyyy-MM-dd'}}}, {'range': {'loc_lat': {'gte': 34, 'lte': 34.5}}}, {'range': {'loc_lon': {'gte': -118.5, 'lte': -117.5}}}, {'exists': {'field': 'pms_pm02_5'}}]}}}, _source=['device', 'when_captured', 'loc_lat', 'loc_lon', 'pms_pm01_0', 'pms_pm02_5', 'pms_pm10_0'])
    # full
    full = [ms['_source'] for ms in raw['hits']['hits']]
    full_sort = wrangle.sort_time(full)
    #time = wrangle.wrangle_line(full)
    # get latest
    latest = wrangle.get_latest(full)

    return ['raw', latest, full_sort]

@app.route("/index")
def index():
    data = get_data()

    return render_template('index.html', data=data)

@app.route("/data", methods=['GET', 'POST'])
def filter(): 
    data = get_data()
    
    if request.method == 'POST':
        bound = request.get_json()[0]
        filtered = wrangle.is_within_custom(bound, data[2])
        filtered_latest = wrangle.get_latest(filtered)
        filtered_time = wrangle.sort_time(filtered)
        bound = ['filtered', filtered_latest, filtered_time, bound]
        return render_template('map.html', data=bound) 

    return render_template('map.html', data=data)

if __name__ == "__main__":
    app.run(debug=True)
