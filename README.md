# dht2csv
Reads DHT22, DHT11 or AM2302 sensor values, writes to CSV.

# Installation
```bash
cd ~/projects
git clone https://github.com/HardwareProjects/dht2csv.git
cd dht2csv
npm install

# Now open the sensorconfig.json file and check the sensor pin and other settings.

# Copy gpio rules that are needed to start the script without sudo.
sudo cp install/20-gpio.rules /etc/udev/rules.d

# Copy the service configuration file.
# It contains the full path to the start script (/home/pi/projects/dht2csv/lib/app.js).
sudo cp install/dht2csv.service /etc/systemd/system

# Make the daemon aware of the service.
sudo systemctl daemon-reload

# Make it autostart on boot.
sudo systemctl enable dht2csv.service

# Start it.
sudo systemctl start dht2csv.service

# Check status.
systemctl status dht2csv.service

# Check the output.
cd ~/projects/dht2csv/data-files
```