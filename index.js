"use strict";

let mapOptions = {
    zoom: 3,
    center: new google.maps.LatLng(0, 0),
    mapTypeId: google.maps.MapTypeId.ROADMAP
};

let mapElements = new Map();
let id = 0;

// Attach a map to the DOM Element, with the defined settings
const map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
const addBtn = document.getElementById('add-element-button');
const addVesselBtn = document.getElementById('add-vessel-button');

const addDialog = document.getElementById('add-dialog');
const addVesselDialog = document.getElementById('add-vessel-dialog');

const addElement = document.getElementById('add-form');
const addVesselForm = document.getElementById('add-vessel-form');

const textField = document.querySelector('textarea[name=coordinates]');
const snackbarContainer = document.querySelector('#delete-snackbar');

addBtn.addEventListener('click', openAddDialog);
addVesselBtn.addEventListener('click', openVesselAddDialog);
addElement.addEventListener('submit', formElementSubmit);

addVesselForm.addEventListener('submit', addVesselSubmit);
addDialog.querySelector('.close').addEventListener('click', () => addDialog.close());
addVesselDialog.querySelector('.close').addEventListener('click', () => addVesselDialog.close());

function openVesselAddDialog() {
    addVesselDialog.showModal();
}

function openAddDialog() {
    addDialog.showModal();
}

function formElementSubmit(e) {
    e.preventDefault();
    addDialog.close();

    let content = textField.value;
    let elementId = ++id;
    let positions = parseInput(content);
    let newElement;

    if (positions.length === 1) {
        newElement = new google.maps.Marker({
            id: elementId,
            position: positions[0],
            map: map
        });
    } else if (positions.length > 1) {
        newElement = new google.maps.Polygon({
            id: elementId,
            paths: positions,
            map: map,
            strokeColor: 'black',
            strokeOpacity: 1,
            fillColor: 'black',
            fillOpacity: 0.4
        })
    }

    newElement.addListener('click', checkDeletion);
    mapElements.set(elementId, newElement);

    textField.value = "";
}

function checkDeletion(e) {
    let elementId = this.id;
    let data = {
        message: `Delete Element #${elementId}?`,
        timeout: 4000,
        actionHandler: function() {
            mapElements.get(elementId).setMap(null);
            mapElements.delete(elementId);
        },
        actionText: 'Yes'
    };

    snackbarContainer.MaterialSnackbar.showSnackbar(data);
}

function angleAsHeading(a) {
    if (a >= 360) {
        return a % 360
    } else if (a < 0) {
        return 360 + a
    } else return a
}

function toRad(a) {
    return a * (Math.PI / 180);
}

function toDeg(a) {
    return a * (180/Math.PI);
}

let GeoUtil = {
    travel: function(pos, heading, distance) {
        return geolib.computeDestinationPoint({latitude: pos.lat(), longitude: pos.lng()}, distance, heading)
    }
}

function addVesselSubmit(e) {
    e.preventDefault();
    addVesselDialog.close();
    let data = {
        antennaCoordinates: document.querySelector('#vessel-coordinates').value.split(',').map(_ => _.trim()).map(parseFloat),
        heading: parseFloat(document.querySelector('#vessel-heading').value.trim()),
        width: parseFloat(document.querySelector('#vessel-width').value.trim()),
        length: parseFloat(document.querySelector('#vessel-length').value.trim()),
        dims: document.querySelector('#vessel-dims').value.split(',').map(_ => _.trim()).map(parseFloat),
    }

    map.setCenter(toupleAsLatLng(data.antennaCoordinates));
    map.setZoom(18);

    let antennaPosition = toupleAsLatLng(data.antennaCoordinates)

    // offsets of antenna position
    let offsetLeft = data.dims[2]
    let offsetBottom = data.dims[1]
    let offsetRight = data.dims[3]
    let offsetTop = data.dims[0]

    let heading = toRad(data.heading)

    var aHeadingIncrement = Math.atan(offsetLeft / offsetBottom)
    if(Number.isNaN(aHeadingIncrement)) aHeadingIncrement = Math.PI/2

    var bHeadingIncrement = Math.atan(offsetRight / offsetBottom)
    if(Number.isNaN(bHeadingIncrement)) bHeadingIncrement = Math.PI/2

    var dHeadingIncrement = Math.atan(offsetLeft / offsetTop)
    if(Number.isNaN(dHeadingIncrement)) dHeadingIncrement = Math.PI/2

    var cHeadingIncrement = Math.atan(offsetRight / offsetTop)
    if(Number.isNaN(cHeadingIncrement)) cHeadingIncrement = Math.PI/2

    // left bottom
    let aHeading = angleAsHeading(toDeg(Math.PI + heading + aHeadingIncrement))
    let aDistance = Math.sqrt(Math.pow(offsetLeft, 2) + Math.pow(offsetBottom, 2))
    let a = GeoUtil.travel(antennaPosition, aHeading, aDistance)

    // right bottom
    let bHeading = angleAsHeading(toDeg(Math.PI + heading - bHeadingIncrement))
    let bDistance = Math.sqrt(Math.pow(offsetRight, 2) + Math.pow(offsetBottom, 2))
    let b = GeoUtil.travel(antennaPosition, bHeading, bDistance)

    // top right
    let cHeading = angleAsHeading(toDeg(heading + cHeadingIncrement))
    let cDistance = Math.sqrt(Math.pow(offsetRight, 2) + Math.pow(offsetTop, 2))
    let c = GeoUtil.travel(antennaPosition, cHeading, cDistance)

    //top left
    let dHeading = angleAsHeading(toDeg(heading - dHeadingIncrement))
    let dDistance = Math.sqrt(Math.pow(offsetLeft, 2) + Math.pow(offsetTop, 2))
    let d = GeoUtil.travel(antennaPosition, dHeading, dDistance)

    let pos = [a, b, c, d].map(p => toupleAsLatLng([p.latitude, p.longitude]))

    let antennaId = ++id;
    let elementId = ++id;

    let polygon = new google.maps.Polygon({
        id: elementId,
        paths: pos,
        map: map,
        strokeColor: 'black',
        strokeOpacity: 1,
        fillColor: 'black',
        fillOpacity: 0.4
    });

    let antenna = new google.maps.Marker({
        id: antennaId,
        position: antennaPosition,
        map: map
    });

    polygon.addListener('click', checkDeletion);
    mapElements.set(elementId, polygon);

    antenna.addListener('click', checkDeletion);
    mapElements.set(antennaId, antenna);
}

/**
 * Returns list of LatLng
 */
function parseInput(inText) {
    const coords = inText.split("\n");
    return coords.map(_ => {
        let latLng = _.split(',');
        if (!_) return undefined;
        return toupleAsLatLng(latLng);
    }).filter(_ => _ !== undefined);
}

function toupleAsLatLng(input) {
    return new google.maps.LatLng(input[0], input[1])
}
