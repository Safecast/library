import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon, Point
import json

class wrangle:

    def sort_time(self, data, time='when_captured'):
        data = pd.DataFrame(data)
        data[time] = pd.to_datetime(data[time], format='%Y-%m-%dT%H:%M:%SZ')
        data = data.sort_values(time)
        data[time] = data[time].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        data = data.to_json(orient='records')
        return json.loads(data)

    def wrangle_line(self, data, device='device'):
        data = pd.DataFrame(data)
        data = data.groupby(device).apply(lambda x: x.to_json(orient='records')).reset_index().rename(columns={0: 'values'})
        data = json.loads(data.to_json(orient='records'))
        return data

    def get_latest(self, data, time='when_captured', device='device'):
        data = pd.DataFrame(data)
        data[time] = pd.to_datetime(data[time], format='%Y-%m-%dT%H:%M:%SZ')
        data = data.sort_values(time, ascending=False).drop_duplicates(device)
        data[time] = data[time].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        data = json.loads(data.to_json(orient='records'))
        return data

    def is_within_custom(self, bound, data):
        bound = [(coord['lng'], coord['lat']) for coord in bound]
        bound = Polygon(bound)

        datasf = pd.DataFrame(data)
        datasf['within'] = [True if Point(point['loc_lon'], point['loc_lat']).within(bound) else False for point in data]
        filtered = datasf[datasf['within'] == True].to_json(orient='records')
        filtered = json.loads(filtered)
        return filtered