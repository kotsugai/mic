var Transform = require('stream').Transform;
var util = require("util");

function IsSilence(options) {
    var that = this;
    if (options && options.debug) {
      that.debug = options.debug;
      delete options.debug;
    }
    Transform.call(that, options);
    var consecSilenceCount = 0;
    var numSilenceFramesExitThresh = 0;

    that.getNumSilenceFramesExitThresh = function getNumSilenceFramesExitThresh() {
        return numSilenceFramesExitThresh;
    };

    that.getConsecSilenceCount = function getConsecSilenceCount() {
        return consecSilenceCount;
    };

    that.setNumSilenceFramesExitThresh = function setNumSilenceFramesExitThresh(numFrames) {
        numSilenceFramesExitThresh = numFrames;
        return;
    };

    that.incrConsecSilenceCount = function incrConsecSilenceCount() {
        consecSilenceCount++;
        return consecSilenceCount;
    };

    that.resetConsecSilenceCount = function resetConsecSilenceCount() {
        consecSilenceCount = 0;
        return;
    };

    // ### add silent status
    var is_silent = true;
    that.isSilent = function isSilent(){
        return is_silent;
    }
    that.setSilent = function setSilent(value){
        is_silent = value;
        return is_silent;
    }
    // ### add silent status

};
util.inherits(IsSilence, Transform);

IsSilence.prototype._transform = function(chunk, encoding, callback) {
    var i;
    var speechSample;
    var silenceLength = 0;
    var self = this;
    var debug = self.debug;
    var consecutiveSilence = self.getConsecSilenceCount();
    var numSilenceFramesExitThresh = self.getNumSilenceFramesExitThresh();
    var incrementConsecSilence = self.incrConsecSilenceCount;
    var resetConsecSilence = self.resetConsecSilenceCount;
    // ### get current silent status
    var is_silent = self.isSilent();
    // ### get current silent status

    if(numSilenceFramesExitThresh) {
        for(i=0; i<chunk.length; i=i+2) {
            if(chunk[i+1] > 128) {
                speechSample = (chunk[i+1] - 256) * 256;
            } else {
                speechSample = chunk[i+1] * 256;
            }
            speechSample += chunk[i];

            if(Math.abs(speechSample) > 2000) {
                if (debug) {
                  console.log("Found speech block");
                }
                resetConsecSilence();
                // ### change silent status
                if(is_silent){
                    is_silent = self.setSilent(false);
                    self.emit('notSilence');
                }
                // ### change silent status
                break;
            } else {
                silenceLength++;
            }

        }
        if(silenceLength == chunk.length/2) {
            consecutiveSilence = incrementConsecSilence();
            if (debug) {
              console.log("Found silence block: %d of %d", consecutiveSilence, numSilenceFramesExitThresh);
            }
            //emit 'silence' only once each time the threshold condition is met
            if( consecutiveSilence === numSilenceFramesExitThresh) {
                // ### change silent status
                is_silent = self.setSilent(true);
                // ### change silent status
                self.emit('silence');
            }
        }
    }
    
    // push chunk if not silent
    if(!is_silent){
        this.push(chunk);
    }
    // push chunk if not silent
    callback();
};

module.exports = IsSilence;