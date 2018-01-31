
// Import ipc
ipc = require('electron').ipcRenderer;

// Define UI elements
let ui = {
    timer: document.getElementById('timer'),
    example: document.getElementById('example'),
    field: document.getElementById('field'),
    rps: {
	x: 0,
	y: 0
    },
    robotState: document.getElementById('robot-state').firstChild,
    gyro: {
        container: document.getElementById('gyro'),
        val: 0,
        offset: 0,
        visualVal: 0,
        arm: document.getElementById('rotation-arm')
    },
    velocity: {
    	directionVal: 0,
    	magnitudeVal: 50,
    	arm: document.getElementById('velocity-arm'),
    	armRect: document.getElementById('velocity-arm-rect'),
    	armTri: document.getElementById('velocity-arm-tri')
    }
};

// Define NetworkTable Addresses

let address = document.getElementById('connect-address'),
    connect = document.getElementById('connect');

// Set function to be called on NetworkTables connect. Usually not necessary.
//NetworkTables.addWsConnectionListener(onNetworkTablesConnection, true);

// Set function to be called when robot dis/connects
NetworkTables.addRobotConnectionListener(onRobotConnection, false);

// Sets function to be called when any NetworkTables key/value changes
NetworkTables.addGlobalListener(onValueChanged, true);

// Function for hiding the connect box
let escCount = 2;
onkeydown = key => {
    if (key.key === 'Escape') {
        setTimeout(() => { escCount = 0; }, 400);
        escCount++;
        if (escCount === 2) document.body.classList.toggle('login-close', true);
    }
    else console.log(key.key);
};

/**
 * Function to be called when robot connects
 * @param {boolean} connected
 */
function onRobotConnection(connected) {
    var state = connected ? 'Robot connected!' : 'Robot disconnected.';
    console.log(state);
    ui.robotState.data = state;
    if (connected) {
        // On connect hide the connect popup
        document.body.classList.toggle('login-close', true);
    }
    else {
        // On disconnect show the connect popup
        document.body.classList.toggle('login-close', false);
        // Add Enter key handler
        address.onkeydown = ev => {
            if (ev.key === 'Enter') {
                connect.click();
            }
        };
        // Enable the input and the button
        address.disabled = false;
        connect.disabled = false;
        connect.firstChild.data = 'Connect';
        // Add the default address and select xxxx
        address.value = '10.6.23.2';
        address.focus();
        address.setSelectionRange(8, 12);
        // On click try to connect and disable the input and the button
        connect.onclick = () => {
            ipc.send('connect', address.value);
            address.disabled = true;
            connect.disabled = true;
            connect.firstChild.data = 'Connecting';
        };
    }
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~ FIELD CANVAS~~~~~~~~~~~~~~~~~~~~~~~~~
//variables to change appearance
let horizontalDisplacement = 103;

//Define field
let context = ui.field.getContext("2d");
let image = new Image();
image.src="Field.png";
//TODO flip the image if the team is red (use style.transform = "scaleX(-1)" )
context.drawImage(image, horizontalDisplacement, 0, 248, 500);

//TODO color the switches and scale depending on color randomization

//define the rps (Robot Positioning System)
let rps= new Image();
rps.src="paw.png";

//rps' x network key listener function
let rps_xf = (key, value) => {
    //TODO trim to max and min, scale
    ui.rps.x = value + horizontalDisplacement;
    //redraw field (we only put this in x because we don't want to redraw too often)
    context.drawImage(image, horizontalDisplacement, 0, 248, 500);
    context.drawImage(rps, ui.rps.x, ui.rps.y, 30, 30);
}
NetworkTables.addKeyListener('/robot/position/x', rps_xf);
NetworkTables.putValue('/robot/position/x', 0);
//rps' y network key listener function
let rps_yf = (key, value) => {
    //TODO trim to max and min, scale
    ui.rps.y = value;
    
}
NetworkTables.addKeyListener('/robot/position/y', rps_yf);
NetworkTables.putValue('/robot/position/y', 0);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**** KEY Listeners ****/

//Gyro rotation
let updateRotation = (key, value) => {
    ui.gyro.arm.style.transform = "rotate(" + value + "deg)";
}
NetworkTables.addKeyListener('/cob/rotation', updateRotation);
NetworkTables.putValue('/cob/rotation', 100);

//Velocity direction detection
//Gyro rotation
let updateVelocityRotation = (key, value) => {
    ui.velocity.arm.style.transform = "rotate(" + value + "deg)";
}
NetworkTables.addKeyListener('/cob/velocity/direction', updateVelocityRotation);
NetworkTables.putValue('/cob/velocity/direction', 100);

//Velocity magnitude detection
const scaleConst = 115 / 65;
let updateVelocityMagnitude = (key, value) => {
	//let 1 be the maximum value the arrow can be, and 0 be the minimum (not moving)
	//first trim the value just in case
	//if (value < 0) value = 0;
	//if (value > 1) value = 1;
	//we set our initial scale (currentScale) relative to the max size (115px)
	//we can now multiply that initial factor by value to get the real scale.
	//scale the armrect
	ui.velocity.armRect.style.transform = "scale(1, " + (value * scaleConst) + ")";
	ui.velocity.armTri.style.transform = "translate(0px, " + (48 - 103 * value) + "px)";
	NetworkTables.putValue("/debug/scaleConst", scaleConst);
}
NetworkTables.addKeyListener('/cob/velocity/magnitude', updateVelocityMagnitude);
NetworkTables.putValue('/cob/velocity/magnitude', 0.5);


//example
let updateExample = (key, value) => {
    ui.example.innerHTML = value + " hi";
}
NetworkTables.addKeyListener('/example/hello', updateExample);
NetworkTables.putValue('/example/hello', "hi");

NetworkTables.addKeyListener('/robot/time', (key, value) => {
    // This is an example of how a dashboard could display the remaining time in a match.
    // We assume here that value is an integer representing the number of seconds left.
    ui.timer.innerHTML = value < 0 ? '0:00' : Math.floor(value / 60) + ':' + (value % 60 < 10 ? '0' : '') + value % 60;
});
NetworkTables.putValue('/robot/time', 124);

/**
 * Global Listener that runs whenever any value changes
 * @param {string} key
 * @param value
 * @param {boolean} isNew
 */
function onValueChanged(key, value, isNew) {
    // Sometimes, NetworkTables will pass booleans as strings. This corrects for that.
    if (value === 'true') {
        value = true;
    }
    else if (value === 'false') {
        value = false;
    }
    // The following code manages tuning section of the interface.
    // This section displays a list of all NetworkTables variables (that start with /SmartDashboard/) and allows you to directly manipulate them.
    var propName = key.substring(16, key.length);
    // Check if value is new and doesn't have a spot on the list yet
    if (isNew && !document.getElementsByName(propName)[0]) {
        // Make sure name starts with /SmartDashboard/. Properties that don't are technical and don't need to be shown on the list.
        if (/^\/SmartDashboard\//.test(key)) {
            // Make a new div for this value
            var div = document.createElement('div'); // Make div
            ui.tuning.list.appendChild(div); // Add the div to the page
            var p = document.createElement('p'); // Make a <p> to display the name of the property
            p.appendChild(document.createTextNode(propName)); // Make content of <p> have the name of the NetworkTables value
            div.appendChild(p); // Put <p> in div
            var input = document.createElement('input'); // Create input
            input.name = propName; // Make its name property be the name of the NetworkTables value
            input.value = value; // Set
            // The following statement figures out which data type the variable is.
            // If it's a boolean, it will make the input be a checkbox. If it's a number,
            // it will make it a number chooser with up and down arrows in the box. Otherwise, it will make it a textbox.
            if (typeof value === 'boolean') {
                input.type = 'checkbox';
                input.checked = value; // value property doesn't work on checkboxes, we'll need to use the checked property instead
                input.onchange = function() {
                    // For booleans, send bool of whether or not checkbox is checked
                    NetworkTables.putValue(key, this.checked);
                };
            }
            else if (!isNaN(value)) {
                input.type = 'number';
                input.onchange = function() {
                    // For number values, send value of input as an int.
                    NetworkTables.putValue(key, parseInt(this.value));
                };
            }
            else {
                input.type = 'text';
                input.onchange = function() {
                    // For normal text values, just send the value.
                    NetworkTables.putValue(key, this.value);
                };
            }
            // Put the input into the div.
            div.appendChild(input);
        }
    }
    else {
        // Find already-existing input for changing this variable
        var oldInput = document.getElementsByName(propName)[0];
        if (oldInput) {
            if (oldInput.type === 'checkbox') oldInput.checked = value;
            else oldInput.value = value;
        }
        else console.log('Error: Non-new variable ' + key + ' not present in tuning list!');
    }
}