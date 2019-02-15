# NEEO-Driver-Yoctopuce

This driver allows to control some devices from the Yoctopuce line-up through a [NEEO universal remote](http://www.neeo.com) and a IP connection. Supported functions are
  - Sensor ([All Yoctopuce devices featuring a sensor](http://www.yoctopuce.com/EN/products/category/usb-environmental-sensors))
  - Relay ([Yocto-Relay](http://www.yoctopuce.com/EN/products/yocto-relay), [Yocto-PowerRelay](http://www.yoctopuce.com/EN/products/yocto-powerrelay-v3), [Yocto-MaxiPowerRelay](http://www.yoctopuce.com/EN/products/yocto-maxipowerrelay), [Yocto-MaxiCoupler](http://www.yoctopuce.com/EN/products/yocto-maxicoupler) )
  - Servo ([Yocto-Servo](http://www.yoctopuce.com/EN/products/yocto-servo))
  - PwmOutput ( [Yocto-PWM-tx](http://www.yoctopuce.com/EN/products/yocto-pwm-tx))
  - VoltageOutput ([Yocto-0-10v-tx](http://www.yoctopuce.com/EN/products/yocto-0-10v-tx))
  - CurrentLoopOutput ([Yocto-4-20mA-tx](http://www.yoctopuce.com/EN/products/yocto-4-20ma-tx))
 
# Requirement
For this driver to work, you will need a always-ON computer connected to the same network as the NEEO brain is. Make sure that Node.js (min 7.6) and NPM are installed on that computer. The driver works on both Windows and Linux. If you don't have such a computer, a cheap baby computer such as a RaspberryPI will do.

# Installation
Just copy the files wherever you want, and in the same folder, type:
```sh
$ npm install
```
NEEO SDK and Yoctopuce library will be automatically downloaded and installed.

# Usage
Just start the driver:
```sh
$ node index.js
```
And it will start to scan the local network to find the NEEO brain and any available YoctoHub, then it will create an NEEO entry for any compatible Yoctopuce device connected to the discovered YoctoHubs. If for some reason the automatic discovery fails, the Brain and/or  the YoctoHub IP addresses can be hardcoded in the driver source code, for instance:

```javascript
var NEEO_brain_IP = "192.168.0.5";  
var YoctoHubs_IP =  ["192.168.0.2","192.168.0.3","toto:1234@192.168.0.4"];
```
When such hardcoded IP addresses are defined, automatic discovery is disabled.

As soon as the first entries are created you can add them to the NEEO remote: Search for "Yoctopuce" devices, all discovered Yoctopuce devices will appear, add them andthat's it. Note that the driver creates "Accessory" devices, that means that you have to add them manually in rooms "shortcut" panels.

You will find more information about this driver on [Yoctopuce web site](http://www.yoctopuce.com/EN/article/yoctopuce-neeo-the-useless-driver).

Enjoy your NEEO remote while you can.
