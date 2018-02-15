
// Import ipc
ipc = require('electron').ipcRenderer;

//define addresses
let addresses = {
		rotation: '/cob/rotation',
		position: {
			x: '/cob/position/x',
			y: '/cob/position/y'
		},
		velocity: {
			direction: '/cob/velocity/direction',
			magnitude: '/cob/velocity/magnitude'
		},
		arm: {
			height: '/cob/arm/height',
			cubeGrabbed: '/cob/arm/cube-grabbed',
			climbStatus: '/cob/arm/climb-status'
		},
		autonomous: {
			emergencyStop: '/cob/autonomous/emergency-stop',
			side: '/cob/autonomous/side',
			instructions: '/cob/autonomous/instructions',
			disableOpposite: '/cob/autonomous/disable-opposite',
		},
		fms: {
			time: '/FMSInfo/???????', //find key for timer
			field: '/FMSInfo/GameSpecificMethod',
			alliance: '/FMSInfo/IsRedAlliance'
		},
		debug: {
			error: '/cob/debug/error'
		}
};

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
    },
    autonomous: {
    	alliance: false,
    	autoChooser: document.getElementById('auto-chooser'),
    	fieldConfigDisplay: document.getElementById('auto-field-config'),
    	leftBox: document.getElementById('auto-left'),
    	centerBox: document.getElementById('auto-center'),
    	rightBox: document.getElementById('auto-right'),
    	canvas: document.getElementById('auto-field-canvas'),
    	left: {
    		doEasiestRadio: document.getElementById('auto-left-choice-easy'),
    		doSwitchRadio: document.getElementById('auto-left-choice-switch'),
    		doScaleRadio: document.getElementById('auto-left-choice-scale'),
    		doBaselineRadio: document.getElementById('auto-left-choice-baseline')
    	},
    	center: {
    		delayCounter: document.getElementById('auto-center-delay')
    	},
    	right: {
    		doEasiestRadio: document.getElementById('auto-right-choice-easy'),
    		doSwitchRadio: document.getElementById('auto-right-choice-switch'),
    		doScaleRadio: document.getElementById('auto-right-choice-scale'),
    		doBaselineRadio: document.getElementById('auto-right-choice-baseline')
    	},
    	disableOppositeCheckbox: document.getElementById('auto-checkbox-disable-opposite'),
    	emergencyStopCheckbox: document.getElementById('auto-checkbox-emergency-no-auto')
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
        // CHANGE THIS VALUE TO YOUR ROBOT'S IP ADDRESS
        address.value = 'roborio-623-frc.local';
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

let autonomousRunning = false;

//rps' x network key listener function
let rps_xf = (key, value) => {
    //TODO trim to max and min, scale
    ui.rps.x = value + horizontalDisplacement;
    //redraw field (we only put this in x because we don't want to redraw too often)
    drawField();
}
NetworkTables.addKeyListener('' + addresses.position.x, rps_xf);
NetworkTables.putValue('' + addresses.position.x, 0);
//rps' y network key listener function
let rps_yf = (key, value) => {
    //TODO trim to max and min, scale
    ui.rps.y = value;
    
}
NetworkTables.addKeyListener('' + addresses.position.y, rps_yf);
NetworkTables.putValue('' + addresses.position.y, 0);

//Image declarations for drawField()
//We declare them here because the images won't have to load every time we call drawField().
let blueFieldImg = new Image();
blueFieldImg.src = "FieldBlue.png";
let redFieldImg = new Image();
redFieldImg.src = "FieldRed.png";
let rps= new Image();
rps.src="paw.png";
let death = new Image();
death.src="Death.png";

drawField();
//Function to redraw the entire field and everything on it
function drawField() {
	
	//define variables
	let context = ui.field.getContext("2d");
	let fieldImg = null
	let alliance = ui.autonomous.alliance;
	if (alliance == 'true' || alliance == true)
		fieldImg = redFieldImg;
	else
		fieldImg = blueFieldImg;
	//variables to change appearance
	let horizontalDisplacement = 103;
	
	//clear the context
	context.clearRect(0, 0, ui.field.width, ui.field.height);
	
	//begin drawing
	if (context != null) {
		//WHEN DRAWING THE FIELD-- WE DRAW THE LOWER ITEMS FIRST
		
		//First draw the field
		context.drawImage(fieldImg, horizontalDisplacement, 0, 248, 500);
		
		//Draw the colors and the null zone
		let ourColor = alliance ? "rgba(234, 0, 0, 0.68)" : "rgba(0, 0, 234, 0.68)";
		let theirColor = alliance ? "rgba(0, 0, 234, 0.6)" : "rgba(234, 0, 0, 0.68)";
		
		//far switch
		context.fillStyle = isOurs(0, 2) ? '' + ourColor : '' + theirColor;
		context.fillRect(horizontalDisplacement + 75, 125, 22, 33);
		context.fillStyle = isOurs(1, 2) ? '' + ourColor : '' + theirColor;
		context.fillRect(horizontalDisplacement + 150, 125, 22, 33);
		
		//scale
		context.fillStyle = isOurs(0, 1) ? '' + ourColor : '' + theirColor;
		context.fillRect(horizontalDisplacement + 62, 109 + 125, 22, 33);
		context.fillStyle = isOurs(1, 1) ? '' + ourColor : '' + theirColor;
		context.fillRect(horizontalDisplacement + 163, 109 + 125, 22, 33);
		
		//near switch
		context.fillStyle = isOurs(0, 0) ? '' + ourColor : '' + theirColor;
		context.fillRect(horizontalDisplacement + 75, 218 + 125, 22, 33);
		context.fillStyle = isOurs(1, 0) ? '' + ourColor : '' + theirColor;
		context.fillRect(horizontalDisplacement + 150, 218 + 125, 22, 33);
		
		//null zone
		context.fillStyle = 'rgba(0, 0, 0, 0.8)';
		if (!isOurs(0, 1)) {
			context.fillRect(horizontalDisplacement + 10, 224, 70, 52);
			context.drawImage(death, horizontalDisplacement + 10 + 35 - 12, 224 + 12, 25, 25);
		} else {
			context.fillRect(horizontalDisplacement + 10 + 160, 224, 70, 52);
			context.drawImage(death, horizontalDisplacement + 10 + 35 + 160 - 12, 225 + 12, 25, 25);

		}
		
		//Draw the autonomous
		//first draw start pos
		let position = ui.autonomous.autoChooser.selectedIndex - 1;
		let drawPosX = horizontalDisplacement + 50 + 72 * position;
		let drawPosY = 460;
		
		//set line properties
		context.save();
		context.strokeStyle = "gold";
		context.lineWidth = 10;
		
		//draw auto paths
		switch (position) {
		
		case -1: { //none
			//draw nothing
		}
		case 0: { //left
			//draw path to scale or switch, depending on randomization and custom selection
		}
		case 1: { //center
			//draw path to correct side of switch based on randomization and custom selection
		}
		case 2: { //right
			//draw path to scale or switch, depending on randomization and custom selection
		}
		}
		
		let grd= context.createRadialGradient(5, 5, 5, 12, 12, 12);
		grd.addColorStop(0, "rgba(255, 0, 0, 1)");
		grd.addColorStop(1, "rgba(0, 255, 0, 1)");
		context.fillStyle = grd;
		context.fillRect(drawPosX - 12, drawPosY - 12, 25, 25);
		
		
		//Draw the robot's position (we do this last so that everything is under it)
	    context.drawImage(rps, ui.rps.x - 15, ui.rps.y - 15, 30, 30);
	}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**** KEY Listeners ****/

//Gyro rotation
let updateRotation = (key, value) => {
    ui.gyro.arm.style.transform = "rotate(" + value + "deg)";
}
NetworkTables.addKeyListener('' + addresses.rotation, updateRotation);

//Velocity direction detection
//Gyro rotation
let updateVelocityRotation = (key, value) => {
    ui.velocity.arm.style.transform = "rotate(" + value + "deg)";
}
NetworkTables.addKeyListener('' + addresses.velocity.direction, updateVelocityRotation);
NetworkTables.putValue('' + addresses.velocity.direction, 100);

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
	//NetworkTables.putValue("/debug/scaleConst", scaleConst);
}
NetworkTables.addKeyListener('' + addresses.velocity.magnitude, updateVelocityMagnitude);
NetworkTables.putValue('' + addresses.velocity.magnitude, 0.5);


//example
let updateExample = (key, value) => {
    ui.example.innerHTML = value + " hi";
}
NetworkTables.addKeyListener('/example/hello', updateExample);
NetworkTables.putValue('/example/hello', "hi");

NetworkTables.addKeyListener( '' + addresses.timer, (key, value) => {
    // This is an example of how a dashboard could display the remaining time in a match.
    // We assume here that value is an integer representing the number of seconds left.
    ui.timer.innerHTML = value < 0 ? '0:00' : Math.floor(value / 60) + ':' + (value % 60 < 10 ? '0' : '') + value % 60;
});
NetworkTables.putValue('' + addresses.timer, 124);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ AUTONOMOUS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
updateAutoOptions();

//field config display
NetworkTables.addKeyListener('' + addresses.fms.field, (key, value) => {
	ui.autonomous.fieldConfigDisplay.innerHTML = value;
	updateAutoOptions();
	drawField();
});
NetworkTables.putValue('' + addresses.fms.field, 'LLL');

//alliance
NetworkTables.addKeyListener('' + addresses.fms.alliance, (key, value) => {
	ui.autonomous.alliance = value;
	drawField();
});
NetworkTables.putValue('' + addresses.fms.alliance, false);

//Auto chooser 
ui.autonomous.autoChooser.onchange = function() {
	NetworkTables.putValue('' + addresses.autonomous.side, ui.autonomous.autoChooser.selectedIndex);
	drawField();
	updateAutoOptions();
};

//CENTER CONFIG OPTIONS: when changed, update autonomous data
ui.autonomous.center.delayCounter.onchange = function() {
	NetworkTables.putValue('' + addresses.autonomous.instructions, ui.autonomous.center.delayCounter.value);
}

ui.autonomous.disableOppositeCheckbox.onchange = function() {
	NetworkTables.putValue('' + addresses.autonomous.disableOpposite, ui.autonomous.disableOppositeCheckbox.checked);
	drawField();
}

//Auto doSomethingCheckbox
ui.autonomous.emergencyStopCheckbox.onchange = function() {
	NetworkTables.putValue('' + addresses.autonomous.emergencyStop, ui.autonomous.emergencyStopCheckbox.checked);
	updateAutoOptions();
	drawField();
}

//LEFT CONFIG OPTIONS: when changed, update autonomous NetworkTable value and redraw field
//TODO

ui.autonomous.left.doEasiestRadio.onchange = function() {
	if (ui.autonomous.left.doEasiestRadio.checked)
		NetworkTables.putValue('' + addresses.autonomous.instructions, 0)
}

ui.autonomous.left.doSwitchRadio.onchange = function() {
	if (ui.autonomous.left.doSwitchRadio.checked)
		NetworkTables.putValue('' + addresses.autonomous.instructions, 1);
	drawField();
}

ui.autonomous.left.doScaleRadio.onchange = function() {
	if (ui.autonomous.left.doScaleRadio.checked)
		NetworkTables.putValue('' + addresses.autonomous.instructions, 2);
	drawField();
}

ui.autonomous.left.doBaselineRadio.onchange = function() {
	if (ui.autonomous.left.doBaselineRadio.checked)
		NetworkTables.putValue('' + addresses.autonomous.instructions, 3);
	drawField();
}

//RIGHT CONFIG OPTIONS: when changed, update autonomous NetworkTable value and redraw field

ui.autonomous.right.doEasiestRadio.onchange = function() {
	if (ui.autonomous.right.doEasiestRadio.checked)
		NetworkTables.putValue('' + addresses.autonomous.instructions, 0)
}

ui.autonomous.right.doSwitchRadio.onchange = function() {
	if (ui.autonomous.right.doSwitchRadio.checked)
		NetworkTables.putValue('' + addresses.autonomous.instructions, 1);
	drawField();
}

ui.autonomous.right.doScaleRadio.onchange = function() {
	if (ui.autonomous.right.doScaleRadio.checked)
		NetworkTables.putValue('' + addresses.autonomous.instructions, 2);
	drawField();
}

ui.autonomous.right.doBaselineRadio.onchange = function() {
	if (ui.autonomous.right.doBaselineRadio.checked)
		NetworkTables.putValue('' + addresses.autonomous.instructions, 3);
	drawField();
}

//UPDATE AUTO OPTIONS~~~~ This updates the ui when a certain value has changed.
function updateAutoOptions() {
	
	//first hide everything
	ui.autonomous.leftBox.setAttribute("class", "auto-disabled");
	ui.autonomous.centerBox.setAttribute("class", "auto-disabled");
	ui.autonomous.rightBox.setAttribute("class", "auto-disabled");
	//get key values
	let team = NetworkTables.getValue(addresses.fms.team); //true for red, false for blue
	let fieldData = NetworkTables.getValue(addresses.fms.field); //String to represent the randomization of field
	let position = ui.autonomous.autoChooser.selectedIndex - 1; //String to represent autonomous start pos
	//check all possible permutations and update the board
	if (!ui.autonomous.emergencyStopCheckbox.checked) {
		//left
		if (position == 0) {
			//hide all right & center config options
			//display all left config options
			ui.autonomous.leftBox.setAttribute("class", "auto-left");
		}
		else if (position == 1) {
			//hide all left & right config options
			//display all center config options
			ui.autonomous.centerBox.setAttribute("class", "auto-center");
		}
		else if (position == 2) {
			//hide all left & center config options
			//display all right config options
			ui.autonomous.rightBox.setAttribute("class", "auto-right");
		}
		
	} else {
		//hide everything
	}

	//update the autonomous field
	//uses the flowchart as seen in google drive
	
	//variable declarations
	
	
	
	//first redraw the field
	
    //now use the flowchart
	if (position == 'center') {
		//first draw the starting position
		context.arc(225, 460, 10, 0, 2 * Math.PI, false);
		context.fillStyle = "green";
		context.fill();
		//then draw the arrow pointing to the switch we want to go to
		if (!ui.autonomous.emergencyStopCheckbox.checked) {
			if (isOurs(0,0) === true) {
				//left case
				
			} else {
				//right case
			}
		}
		
	}
}


 
//a function to use that returns whether or not a side of the switch or scale is our alliance's. See code:
/*	.----------.
 * 	|		   |
 * 	| 0,2  1,2 |
 *  | 		   |
 *  | 0,1  1,1 |
 *  | 		   |
 *  | 0,0  1,0 |
 *  |          |
 *  '----------'
 *  	YOU
 */
const SIDES = "RL";
function isOurs(side, number) {
	let data = NetworkTables.getValue('' + addresses.fms.field);
	return (('' + data).charAt(number) == "LR".charAt(side));
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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