// basemap
loadMap = (data) => {
    let mainmap = L
        .map("mainmap")
        .setView([34.0522, -118.2437], 12);

    L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }
    ).addTo(mainmap);
    return data
}

// plot some sample data
/*
let request = new XMLHttpRequest();
request.open('GET', 'https://api.safecast.org/measurements.json');
request.send();

let data;
request.onload = () => {
    if (request.status == 200) {
        data = JSON.parse(request.response);
    } else {
        data = [];
        console.log(`error ${request.status} ${request.statusText}`);
    }
}
*/


// 
