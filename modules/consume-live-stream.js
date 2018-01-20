/* jslint console:true, devel:true, eqeq:true, plusplus:true, sloppy:true, asi:true, vars: true, white:true, esversion:6 */
//TODO:check which requirs are still needed.
//		rewrite to style of server-service-worker
const express = require('express')
const mongoose = require('mongoose')
const Stomp = require('@stomp/stompjs')
const moment = require('moment');
const webSocket = require('./websockets');
require('dotenv').config();		//Secret info

//Settings and vars
const db = mongoose.connection;
const boatEndPoint = '/exchange/biogasboat'
const client = Stomp.client(process.env.SPECTRAL_DB_URL)

// Import all data models
const DataPoint = require('../models/dataPoint')
const StatusPoint = require('../models/statusPoint')

function onData(data){
	console.log("data")
}

//On connection with RabbitMQ, subscribe to a boats data
function onConnect(something){
	console.log('Connected to Rabbit MQ', something)
	client.subscribe(boatEndPoint, onData);
}
//When data is received, process it and store it in MongoDB
function onData(data){
	console.log("received data, will store in MongoDB")
	//console.log(data.body);
	data = JSON.parse(data.body)
	const dataPoint = new DataPoint({
		Date: moment(`${data.Date} ${data.Time}`, 'DD/MM/YYYY HH:mm:ss').add(1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
		Temp_PT100_1: Number(data['Temp_PT100_1']),
		Temp_PT100_2: Number(data['Temp_PT100_2']),
		pH_Value: data['pH_Value'],
		Bag_Height: data['Bag_Height']
	})
	console.log(dataPoint)
	dataPoint
		.save()
		//Send the stored data to the websocket module so it can serve it to the frontend :)
		.then(newDataPoint => webSocket.sendOne(newDataPoint))	 
		//.then(dataPoint => console.log(dataPoint.id))
		//.then(dataPoint => { return DataPoint.find() })
		.catch(err => { throw Error(err) })
	const statusPoint = new StatusPoint(data)
	//console.log(statusPoint)
	statusPoint.Date = moment(`${data.Date} ${data.Time}`, 'DD/MM/YYYY HH:mm:ss').add(1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
	statusPoint.Digester_Heater_1 = data['Digester_Heater_']
	statusPoint
		.save()
		//.then(statusPoint => { return StatusPoint.find()})
		.catch(err => { throw Error(err) })
}

const consumeLiveStream = {
	init() {
		//Connect to Spectrals RabbitMQ to allow for a stomp socket connection
		client.connect(process.env.MQTT_USER, process.env.MQTT_PASS, onConnect, console.error, '/')

		//Connect to our MongoDB server which will host our version of the data
		//The reason we need to do this is because we will generate some new info derived from the raw data
		mongoose.connect(process.env.MONGO_DB_URL);
		mongoose.Promise = global.Promise	//Use the built in ES6 Promise
		db.on('error', (err) =>{
			console.error('Uh oh: ', err.message)
		})
	}
}
module.exports = consumeLiveStream
