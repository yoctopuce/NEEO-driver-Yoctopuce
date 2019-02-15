
/*
 *  NEEO driver for Yoctopuce devices
 * 
 * 
 *   - - - - - - - - - License information: - - - - - - - - -
 *
 *  Copyright (C) 2017 and beyond by Yoctopuce Sarl, Switzerland.
 *
 *  Yoctopuce Sarl (hereafter Licensor) grants to you a perpetual
 *  non-exclusive license to use, modify, copy and integrate this
 *  file into your software for the sole purpose of interfacing
 *  with Yoctopuce products.
 *
 *  You may reproduce and distribute copies of this file in
 *  source or object form, as long as the sole purpose of this
 *  code is to interface with Yoctopuce products. You must retain
 *  this notice in the distributed source file.
 *
 *  You should refer to Yoctopuce General Terms and Conditions
 *  for additional information regarding your rights and
 *  obligations.
 *
 *  THE SOFTWARE AND DOCUMENTATION ARE PROVIDED "AS IS" WITHOUT
 *  WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING
 *  WITHOUT LIMITATION, ANY WARRANTY OF MERCHANTABILITY, FITNESS
 *  FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO
 *  EVENT SHALL LICENSOR BE LIABLE FOR ANY INCIDENTAL, SPECIAL,
 *  INDIRECT OR CONSEQUENTIAL DAMAGES, LOST PROFITS OR LOST DATA,
 *  COST OF PROCUREMENT OF SUBSTITUTE GOODS, TECHNOLOGY OR
 *  SERVICES, ANY CLAIMS BY THIRD PARTIES (INCLUDING BUT NOT
 *  LIMITED TO ANY DEFENSE THEREOF), ANY CLAIMS FOR INDEMNITY OR
 *  CONTRIBUTION, OR OTHER SIMILAR COSTS, WHETHER ASSERTED ON THE
 *  BASIS OF CONTRACT, TORT (INCLUDING NEGLIGENCE), BREACH OF
 *  WARRANTY, OR OTHERWISE.
 */




"use strict"; 

// put your brain IP address here or leave it empty if you want to use discovery
var NEEO_brain_IP = "";  
// put the list of the Yocto-Hub IP addresses you want to use here, or leave it
// empty if you  want to use discovery. If your hubs are protected by a password,
// you *have to* list them here and parameter is then username:password@ipaddress  
var YoctoHubs_IP = [];  // for instance ["192.168.0.1","toto:1234@192.168.0.2"] 



const neeoapi = require("neeo-sdk");
require('yoctolib-es2017/yocto_api.js');
require('yoctolib-es2017/yocto_relay.js');
require('yoctolib-es2017/yocto_servo.js');
require('yoctolib-es2017/yocto_voltageoutput.js');
require('yoctolib-es2017/yocto_voltageoutput.js');
require('yoctolib-es2017/yocto_currentloopoutput.js');
require('yoctolib-es2017/yocto_pwmoutput.js');

 
const neeoSettings = {
  brain: "", 
  port: 1104,
  name: "Yoctopuce",
  devices: []
};

// Global list of Yoctopuce devices found
var YDevices = new Array();
var YDevicesFunctions = new Array();



class YDevice 
{   constructor(hwdID) 
    { this._hwdID = hwdID;
      this._functions = new Array(); 
      this._NEEOdriver =  null;
      this._updateCallbackReference  =null;
    }

   async init()
   {
    this._m      = await YModule.FindModule(this._hwdID);
    this._name   = await this._m.get_friendlyName(); 
    this._serial   = await this._m.get_serialNumber(); 
    if (this._name.substring(this._name.length - 7) ==".module") this._name=this._name.substring(0,this._name.length - 7);
    this._model = await this._m.get_productName();
   }

   addfunction(f) {    this._functions[f.name]=f;}
   get updateCallbackReference() {return this._updateCallbackReference;}
   get functions() {return this._functions}
   get serial()  {return this._hwdID;}

   get name()  {return this._name;}

   async configChangedCallback()
     { await this.init();
       for (var key in this._functions )
        await this._functions[key].refreshFromConfig();
     }
    
   createNEEOdriver()
    { 
      if (this._NEEOdriver)
       { console.error("DRIVER driver already created for this deviue");
         return;

       }
       if (Object.keys(this._functions).length<=0)
        { console.error("can't create driver, this device and no function defined yet");
          return;  
       }

       this._NEEOdriver = neeoapi.buildDevice(this._model+" "+this._name); 
       this._NEEOdriver.setType("ACCESSORY");
       this._NEEOdriver.setManufacturer('Yoctopuce')  
       this._NEEOdriver.setSpecificName(this._model+" "+this._name);  
     //  this._NEEOdriver.addAdditionalSearchToken(this._serial);
 
       for (var key in this._functions )
         this._functions[key].PopulateDriverControls(this._NEEOdriver);
       this._NEEOdriver.registerSubscriptionFunction((updateCallback, optionalCallbackFunctions) => { this._updateCallbackReference = updateCallback; });
       neeoSettings.devices.push(this._NEEOdriver);
    }

   static isYdeviceAlreadyRegistered(hwdID)
   { res =  hwdID in YDevices;  
     return res;   
   } 
}


// generic (abstract) class for Yoctopuce devices function
class YDeviceFunction
 {

  constructor(hwdID) 
    { this._hwdID = hwdID;
      this._label = "labelNotDefined";
      this._name  = "nameNotDefined"
      var p =  hwdID.indexOf(".");
      this._deviceid = hwdID.substring(0,p);
      this._neeoID =  "default";
      this._yObject = null;
    } 

    get hostDevice()
    {  if (this._deviceid  in YDevices) return  YDevices[this._deviceid];
       console.error("internal error: no host device");
       return null;
    }

    static isFunctionAlreadyRegistered(hwdID)
    { var res= hwdID in YDevicesFunctions;  
      return res;
    }

    notifyNEEOServer(action)
     {  try
         {  if (!(this._deviceid  in YDevices)) return; //  device not created yet 
            let  d=  this.hostDevice;
            let callback =  d.updateCallbackReference;

             if (callback!=null) callback(action); // else console.log("warning:  updateCallbackReference is null ");

         }
       catch (e) {console.error(e)};     
      }  
     
    PopulateDriverControls(NEEODriver)
      { console.Error("YDeviceFunction is an abstract class, PopulateDriverControls can't be called directly"); }


  async init()
    { 
      var m = await this._yObject.get_module();
      var serial = await m.get_serialNumber();
      var dev = null;
      if (serial in YDevices) 
        dev=  YDevices[serial]; 
      else
       {  dev = new YDevice(serial);
          await dev.init();

          YDevices[serial]  =dev;
       } 

      this._label = await this._yObject.get_logicalName();
      if (this._label=="") this._label = await   this._yObject.get_friendlyName();    

      console.log(" -> Creating NEEO device function "+this._label );
      dev.addfunction(this);
      YDevicesFunctions[this._hwdID] = this;

    } 
   
  async stateChangedCallback(Yfct,value)
    {  console.log(this._hwdID+" state changed");

    }

  async refreshFromConfig()
     { this._label = await this._yObject.get_logicalName();
      if (this._label=="") this._label = await   this._yObject.get_friendlyName();   
     } 
    


  get label()  { return this._label; } 

  get name()   { return this._hwdID;}
  
  get deviceid() {return this._deviceid;}

  get yObject() {return  this._yObject;}

}

// class for Yoctopuce relays
class YRelayDevice  extends  YDeviceFunction
{
   constructor(hwdID) 
    { super(hwdID) 
      this._state=false;    
    }
    
   async init()
    {  this._yObject = await YRelay.FindRelay(this._hwdID);
       this._state = (await this._yObject.get_state())==YRelay.STATE_B;      
       // register a callback to be called each  time the relay state  changes
       // (we are not the only ones which can change the relay state)  
       this._yObject.registerValueCallback( this.stateChangedCallback.bind(this) )       
       await super.init();             
    }

   get state() {return  this._state;}  

   async refreshFromConfig()
      {  await super.refreshFromConfig();
      }


   // called each  time the relay state changes
   stateChangedCallback(yfct,value)
    { 
     
      // memorize the new state
      this._state = (value =="B" );    
      console.log("relay change ("+value+", state is now "+this._state);
      // notify the NEEO server about the change
       this.notifyNEEOServer({uniqueDeviceId:  this._neeoID, component:this._hwdID, value:this._state} );
      // this.notifyNEEOServer({uniqueDeviceId: "default" , component:this._hwdID, value:this._state } );
    }

   // changes the relay state 
   async set_state(value)
    {  console.log("NEEO is setting setate to "+value);
       await this._yObject.set_state(value ?YRelay.STATE_B:YRelay.STATE_A);
       this._state = value;
    } 

   switchGet (deviceid) {  
    console.log("NEEO is asking for state which is "+this._state); 
    return this._state; }

   async switchSet (deviceid,value)
    { console.log("NEEO changed "+deviceid+" state to "+value)
;      try {   await this.set_state(value); } catch (e) {console.error(e)};     
    }
  
   PopulateDriverControls(NEEODriver)
    {
      NEEODriver.addSwitch({ name: this._hwdID, label: this.label }, { setter: this.switchSet.bind(this), getter: this.switchGet.bind(this) });  

    }


}

// (abstract )class for slider like device, need to be derived
// with classes implementing findYObject, get_Yvalue, set_Yvalue
// Y_to_NEEO_range and NEEO_to_Y_range
class YSliderDevice  extends  YDeviceFunction
{
   constructor(hwdID) 
    { super(hwdID) 
      this._position=0;    
    }
    
   // list of functions that need to be implemented to match the hardware device 
   async  findYObject() {throw "YSliderDevice is an abstract class, findYObject can't be called directly" ;}
   async  get_Yvalue() {throw "YSliderDevice is an abstract class, get_Yvalue can't be called directly"  ;}
   async  set_Yvalue(value ) {throw "YSliderDevice is an abstract class, set_Yvalue  can't be called directly";}
   Y_to_NEEO_range(value)  {throw "YSliderDevice is an abstract class, Y_to_NEEO_range  can't be called directly";}
   NEEO_to_Y_range(value)  {throw "YSliderDevice is an abstract class, NEEO_to_Y_range  can't be called directly";} 

   async init()
    {  this._yObject = await this.findYObject();
       this._position = await  this.get_Yvalue();      
       // register a callback to be called each  time the servo position changes
       // (we are not the only ones which can change the servo position)  
       this._yObject.registerValueCallback( this.stateChangedCallback.bind(this) )       
       await super.init();             
    }

   get position() {return  this._position;}  

   async refreshFromConfig()
      {  await super.refreshFromConfig();
      }

   // called each  time the source position changes
   stateChangedCallback(Yfct,value)
    { // memorize the new position
      this._position = parseInt(value);    
      // notify the NEEO server about the change
      this.notifyNEEOServer({uniqueDeviceId: this._neeoID , component:this._hwdID, value:this.Y_to_NEEO_range(this._position) } );
    }

  
   sliderGet (deviceid) {  return this._position; }

   async sliderSet (deviceid,value)
    { 
      try { await this.set_Yvalue(this.NEEO_to_Y_range(value)); } catch (e) {console.error(e)};     
    } 
    
   PopulateDriverControls(NEEODriver)
    {
      NEEODriver.addSlider({ name: this.name, label: this.label , range:[0,200], unit:""}, { setter: this.sliderSet.bind(this), getter: this.sliderGet.bind(this)});                         
     }

}

 // class for Yocto-Servo
class YServoDevice extends  YSliderDevice
 {
  constructor(hwdID)   { super(hwdID); }
  async  findYObject() {return await YServo.FindServo(this._hwdID);}
  async  get_Yvalue() {return  await  this._yObject.get_position(); }
  async  set_Yvalue(value) { await this._yObject.move(value,500); }
  Y_to_NEEO_range(value) {return (value+1000) /10;}
  NEEO_to_Y_range(value) {return (value*10)-1000} 
 }

 // class for Yocto-0-10V-Tx
 class YVoltageOutputDevice extends  YSliderDevice
 {
  constructor(hwdID)   { super(hwdID); }
  async  findYObject() {return await YVoltageOutput.FindVoltageOutput(this._hwdID);}
  async  get_Yvalue() {return  await this._yObject.get_currentVoltage(); }
  async  set_Yvalue(value) { await this._yObject.voltageMove(value,100); }
  Y_to_NEEO_range(value) {return (value *20);}
  NEEO_to_Y_range(value) {return (value /20);} 
 }

// class for Yocto-4-20mA-Tx
class YCurrentLoopOutputDevice extends  YSliderDevice
 {
  constructor(hwdID)   { super(hwdID); }
  async  findYObject() {return await YCurrentLoopOutput.FindCurrentLoopOutput(this._hwdID);}
  async  get_Yvalue() {return await  this._yObject.get_current(); }
  async  set_Yvalue(value) { await this._yObject.currentMove(value,100); }
  Y_to_NEEO_range(value) {return (value *10);}
  NEEO_to_Y_range(value) {return (value /10);} 
 }

// class for  Yocto-PWM-Tx
class YPwmOutputDevice extends  YSliderDevice
 {
  constructor(hwdID)   { super(hwdID); }
  async  findYObject() {return await YPwmOutput.FindPwmOutput(this._hwdID);}
  async  get_Yvalue() {return  await this._yObject.get_dutyCycle(); }
  async  set_Yvalue(value) 
   {  await this._yObject.set_enabled(value>0?YPwmOutput.ENABLED_TRUE:YPwmOutput.ENABLED_FALSE);
      await this._yObject.dutyCycleMove(value,100);
  }
  Y_to_NEEO_range(value) {return (value *2);}
  NEEO_to_Y_range(value) {return (value /2);} 
 }

// class for Yoctopuce sensors (any sensor)
class YSensorDevice  extends  YDeviceFunction
{
   constructor(hwdID) 
    { super(hwdID)
      this._value = 0;
      this._unit = "";
      this._lastNotification = 0;
      this._notificationtimer = null;
    }
    
   async init()
    { this._yObject = await YSensor.FindSensor(this._hwdID);
      await super.init();   
      await this._yObject.set_resolution(0.1);  // limit the display precision to 1 digit after decimal point
      this._value = await this._yObject.get_currentValue();     
      this._unit = await this._yObject.get_unit(); 
      // register a callback to be called each  time the sensor value changes 
      this._yObject.registerValueCallback( this.stateChangedCallback.bind(this) )       
               
    }

    async refreshFromConfig()
    { 
      
      await super.refreshFromConfig();
      this._unit = await this._yObject.get_unit(); 
      // notify the NEEO server about the change
      console.log("sensor label changed "+this.get_labelValue());
      this.notifyNEEOServer({uniqueDeviceId:  this._neeoID , component:this._hwdID+"-l", value:this.get_labelValue()} );
    }
    
    get value() {return  this._value;} 

    get unit()   {return  this._unit;} 

    get_value() {return  this._value;  }

    get_labelValue() {return this._label+": "+this._value+this._unit}
    
    notifyValueToNEEO()
    {
      // notify the NEEO brain about the change
      this.notifyNEEOServer({uniqueDeviceId:  this._neeoID , component:this._hwdID+"-l", value:this.get_labelValue()} );
      this.notifyNEEOServer({uniqueDeviceId: this._neeoID , component:this._hwdID+"-s", value:this._value} );
      this._lastNotification = Date.now();
      //console.log(this._hwdID+" notification sent");
    }        
    
    
    stateChangedCallback(Yfct,value) // called each time the sensor value changes 
    { // memorize the new state    
      this._value =  parseFloat(value);
      //console.log(this._hwdID+" new value");      
      if (this._notificationtimer!=null) clearTimout(this._notificationtimer);
      this._notificationtimer =null;
      var now = Date.now();
      // prevent from flooding the brain with notifications from ever changing sensors

      if ((now-this._lastNotification)>1000) this.notifyValueToNEEO()
                else setTimeout(()=>{this.notifyValueToNEEO();},1000 );
    }

    PopulateDriverControls(NEEODriver)
    {

      NEEODriver.addSensor({ name: this.name+"-s", label: this.label , deviceId: this.deviceid, type: 'range', range: [-999, 999999], unit: this.unit   },
        { getter: this.get_value.bind(this) });    
        
      NEEODriver.addTextLabel( { name: this.name+"-l", label: this.get_labelValue(),  isLabelVisible: false }, this.get_labelValue.bind(this)  );
    }

}

// this is  automatically called each time a yoctopuce device configuration
// is changed, for instance when a sensor name changes.
async function deviceConfigChanged(m)
{  try{
   
  var serial=await m.get_serialNumber();
  if (serial in YDevices)  await YDevices[serial].configChangedCallback();
} catch(e) {console.log(e);}
 
}

// this is  automatically called each time a yoctopuce device goes online
async function deviceArrival(m)
{ 
  // loop over the devices function to find out if it
  // features any sensor or relays
  try{
  var count = await m.functionCount();
 
  var serial = await m.get_serialNumber();
 
  console.log("new device arrival " + serial);
  var it = null;
  for (var i = 0; i < count; i++)
  { var ftype =await  m.functionType(i);
    var  fbasetype = await m.functionBaseType(i);
    var  hwdid = serial+"."+await  m.functionId(i);
    if( !YDeviceFunction.isFunctionAlreadyRegistered(hwdid))
     { if  (fbasetype == "Sensor")  // yeah! we found a sensor
       { it  =  new YSensorDevice(hwdid);         
         await it.init();       
      }
     else
     if (ftype == "Relay")  // good, we found a relay     
      {  it  =  new YRelayDevice(hwdid);       
        await it.init();        
      }
      else if (ftype == "Servo")  // nice, we found a servo control     
      { 
        
        it = new YServoDevice(hwdid);
        await it.init();         
      }
      else if (ftype == "VoltageOutput")  // hiiiii , we found a voltage output control     
      { 
        it=  new YVoltageOutputDevice(hwdid);
        await it.init();       
      }
      else if (ftype == "CurrentLoopOutput")  // ha ha, we found a cuurent loop output control     
      { 
        it=  new YCurrentLoopOutputDevice(hwdid);
        await it.init();        
      }

      else if (ftype == "PwmOutput")  // Gess what , we found a pwm output control     
      { 
        it=   new YPwmOutputDevice(hwdid);
        await it.init();     
      }

    } else console.log(" Already created");
  }

  if (it!=null)  // at least one insteresting function was created, let create the  
                 // device driver matching the device.
   {

      if (neeoSettings.devices.length>0)  
       { await neeoapi.stopServer(neeoSettings);
         console.log("stopped");

      }
      var dev =it.hostDevice;  
      dev.createNEEOdriver()
      
      console.log("starting server with "+neeoSettings.devices.length+" devices");
      await neeoapi.startServer(neeoSettings);
      
      

     // Lets make sure that we are notified when that device configuration changes
     // (logical name change, unit change etc...) 
     
     var m =  await it.yObject.get_module();
     await m.registerConfigChangeCallback(deviceConfigChanged);


      if (neeoSettings.devices.length==1)  console.log("# READY! use the NEEO app to search for 'Yoctopuce' ");

   }

 
 } catch(e) {console.error(e);}

}

async function discoveryCallback(hub,url)
{
  //console.log("Discovery: "+hub+" : "+url);
  var errmsg="";
  YAPI.RegisterHub(url,errmsg)
}

async function main()
{

  // init the Yoctopuce API and register a callback
  // to be called each time a new device goes online 
  let errmsg="";
  let apiversion = await YAPI.GetAPIVersion();
  console.log("Yoctopuce API version "+apiversion); 
  YAPI.InitAPI(YAPI.DETECT_NONE,errmsg)   
  await YAPI.RegisterDeviceArrivalCallback(deviceArrival);  // deviceArrival wiill be callled  each time a new Yoctopuce device is discovered
 

  if (YoctoHubs_IP.length==0)  
   { await YAPI.RegisterHubDiscoveryCallback(discoveryCallback); // HubDiscoveryCallback will be callled  each time a new Yoctopuce Hub device is discovered
   }
  else
  {  for (var i=0;i<YoctoHubs_IP.length;i++)
      {  console.log("using  YoctoHub "+YoctoHubs_IP[i]);
         await YAPI.PreregisterHub(YoctoHubs_IP[i],errmsg)
      }
  } 
  
  await setInterval(()=>{YAPI.UpdateDeviceList(errmsg);YAPI.TriggerHubDiscovery(errmsg);},2000); // scan for new devices every 2 sec.
  

  // discover the brain
  if (NEEO_brain_IP=="")
  { let brain =null;
    try
      {  brain =  await neeoapi.discoverOneBrain()
      }  catch (err) { console.error("DISCOVERY ERROR!", err); process.exit(1); }   
     console.log('Brain discovered:', brain.name + " ("+brain.iparray[0]+")");
     neeoSettings.brain = brain.iparray[0];
  } else
  {  console.log('Using Brain:' + NEEO_brain_IP);
    neeoSettings.brain = NEEO_brain_IP;
  }
  
  console.log("Waiting for Yoctopuce devices to be discovered, please wait...");

}

// let's roll!
main();

