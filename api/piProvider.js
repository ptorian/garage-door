const { promisify } = require("util");
const { Gpio } = require('onoff');
const garageOpenerOutput = new Gpio(4, 'out');


class PiProvider {
    constructor(logger) {
        this.logger = logger;
    }

    writeValue(output, value) {
        return new Promise((resolve, reject) => {
            output.write(value, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        })
    }

    async activateGarageDoorOpener() {
        this.logger.log("activating garage door opener");
        await this.writeValue(garageOpenerOutput, 1);
        await promisify(setTimeout)(200);
        this.logger.log("deactivating garage door opener");
        await this.writeValue(garageOpenerOutput, 0);
    }
}

module.exports = { PiProvider };