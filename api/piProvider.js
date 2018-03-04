const { promisify } = require("util");
const { Gpio } = require('onoff');

class PiProvider {
    constructor(logger) {
        this.logger = logger;

        this.garageOpenerOutput = new Gpio(4, 'out');
        this.garageDoorOpenInput = new Gpio(17, "in");

        this.watchGarageDoorOpenInput();
    }

    writeValue(gpio, value) {
        return new Promise((resolve, reject) => {
            gpio.write(value, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        });
    }

    readValue(gpio) {
        return new Promise((resolve, reject) => {
            gpio.read((err, value) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(value);
                }
            })
        });
    }

    async activateGarageDoorOpener() {
        this.logger.info("activating garage door opener");
        await this.writeValue(this.garageOpenerOutput, 1);
        await promisify(setTimeout)(200);
        this.logger.info("deactivating garage door opener");
        await this.writeValue(this.garageOpenerOutput, 0);
    }

    async getGarageDoorStatus() {
        return this.readValue(this.garageDoorOpenInput);
    }

    async watchGarageDoorOpenInput() {
        const initialValue = await this.readValue(this.garageDoorOpenInput);
        this.logger.info(`Garage door is initially ${initialValue === 0 ? "open" : "closed"}`);

        this.garageDoorOpenInput.watch((err, value) => {
            if (err) {
                this.logger.error(err);
            }

            this.logger.info(`Garage door is now ${value === 0 ? "open" : "closed"}`);
        });
    }
}

module.exports = { PiProvider };