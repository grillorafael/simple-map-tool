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
const addDialog = document.getElementById('add-dialog');
const addForm = document.getElementById('add-form');
const textField = document.querySelector('textarea[name=coordinates]');
const snackbarContainer = document.querySelector('#delete-snackbar');

addBtn.addEventListener('click', openAddDialog);
addForm.addEventListener('submit', formSubmit);
addDialog.querySelector('.close').addEventListener('click', () => addDialog.close());

function openAddDialog() { addDialog.showModal(); }
function formSubmit(e) {
    e.preventDefault();
    addDialog.close();

    let content = textField.value;
    let elementId = ++id;
    let positions = parseInput(content);
    let newElement;

    if(positions.length === 1) {
        newElement = new google.maps.Marker({
            id: elementId,
            position: positions[0],
            map: map
        });
    }
    else if(positions.length > 1) {
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

/**
 * Returns list of LatLng
 */
function parseInput(inText) {
    const coords = inText.split("\n");
    return coords.map(_ => {
        let latLng = _.split(',');
        if(!_) return undefined;
        return new google.maps.LatLng(latLng[0], latLng[1]);
    }).filter(_ => _ !== undefined);
}
