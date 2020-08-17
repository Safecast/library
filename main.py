from flask import Flask, render_template, request, redirect, url_for
import requests
import json

app = Flask(__name__)

def get_data():
    data = requests.get('https://api.safecast.org/measurements.json?distance=100&latitude=34.0522&longitude=-118.2437')
    if data.status_code == 200:
        data = json.loads(data.content)
    else:
        data = []
    return ['raw', data]

@app.route("/index")
def index():
    data = get_data()
    return render_template('index.html', data=data)

@app.route("/data", methods=['GET', 'POST'])
def data():
    if request.method == 'POST':
        bound = request.get_json()
        print(bound)
        bound = ['filtered', [{'latitude': 34.063467866218254, 'longitude': -118.23561034362642}], bound[0]]
        return render_template('map.html', data=bound) 

    data = get_data()
    return render_template('map.html', data=data)

if __name__ == "__main__":
    app.run(debug=True)