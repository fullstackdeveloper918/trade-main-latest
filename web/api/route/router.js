import express from "express" ;
const route = express.Router();
import DataController from  "../controller/DataController.js";
import TestController from  "../controller/TestController.js"


route.get("/testing", (req,res)=>{
    console.log("hello");
    res.send("Hey hii")
})

route.get("/add-new", (req,res)=>{
    return req.body ;
    
})

route.get("/data",DataController.index );

route.get("/data2",TestController.index2 );

//route.get("/data2",DataController.test );


route.post("/price",DataController.price);

route.post("/price2",TestController.price); 


//route.post("create-order",TestController.createOrder)

 //route.post("/order-creation-sellproduct",DataController.webhook);
route.post("/order-creation-sellproduct2",TestController.webhook1); 

route.get("/devices-info",TestController.deviceInfo);
route.post("/devices-info-edit",TestController.deviceInfoEdit);

route.get("/order-info",TestController.orderInfo);

route.post("/add-new", (req, res) => {
    console.log("req.body",req.body);
    res.json(req.body);
});

export default route