import db_con from "../../db.js";
import  axios from "axios";


const TestController = {}

const getToken = async () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT info FROM enkto`;
        
        db_con.query(query, (err, result) => {
            if (err) {
                //console.error("SQL Error:", err.message);
                return reject(new Error('Internal server error'));
            }
            //console.log(result, 'result is here');
            resolve(result);
        });
    });
};
const insertTestData = async (data) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO test-data (data) VALUES (?)`;
        
        db_con.query(query, [data], (err, result) => {
            if (err) {
                // console.error("SQL Error:", err.message);
                return reject(new Error('Internal server error'));
            }
            // console.log(result, 'result is here');
            resolve(result);
        });
    });
};

const wordpressToken =  async ()=> {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM wordpress_details `;
        db_con.query(query, (err, result) => {
            if (err) {
                //console.error("SQL Error:", err.message);
                return reject(new Error('Internal server error'));
            }
            //console.log(result, 'result is here');
            resolve(result);
        });
    });

}

const saveOrderInfoToDatabase = async (orderInfo) => {
    const { shopify_order_id, shipping_order_info, wordpress_order_id, wordpress_order_info } = orderInfo;
    

   
        const query = `
            INSERT INTO order_info (shoipfy_order_id, shoipfy_order_info, wordpress_order_id, wordpress_order__info)
            VALUES (?, ?, ?, ?)
        `;
        
        const values = [shopify_order_id, shipping_order_info, wordpress_order_id, wordpress_order_info];

    return new Promise((resolve, reject) => {
        db_con.query(query, values, (err, result) => {
            if (err) {
                console.error('SQL Error:', err.message);
                return reject(err); // Reject the promise with the error
            }
            console.log('Order info saved to database:', result);
            resolve(result); // Resolve the promise with the result
        });
    });
}; 


const createUpsShippingLabel = async (shippingInfo) => {
    const upsApiKey = "7315b303c65faf4f65c666a743a4593a8512226f";
    const upsUsername = "Techable123";
    const upsPassword = "UpWork12345!";
    const fromAddress = {
        name: "Sender Name",
        address: "123 Sender St",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
        country: "US",
    };

    const toAddress = shippingInfo.to;
    const packageDetails = {
        weight: 5,
        dimensions: { length: 10, width: 5, height: 5 }
    };

    const requestBody = {
        ShipmentRequest: {
            Shipment: {
                Shipper: {
                    Name: fromAddress.name,
                    Address: {
                        AddressLine: fromAddress.address,
                        City: fromAddress.city,
                        StateProvinceCode: fromAddress.state,
                        PostalCode: fromAddress.zip,
                        CountryCode: fromAddress.country,
                    }
                },
                ShipTo: {
                    Name: `${"SellMac.com"} ${toAddress.last_name}`,
                    Address: {
                        AddressLine: "1512 E ALGONQUIN RD",
                        City: "ARLINGTON HEIGHTS",
                        StateProvinceCode: "60005",
                        PostalCode: "60005",
                        CountryCode: "united states illinois",
                    }
                },
                Package: {
                    PackagingType: {
                        Code: "03"
                    },
                    Dimensions: {
                        Length: packageDetails.dimensions.length,
                        Width: packageDetails.dimensions.width,
                        Height: packageDetails.dimensions.height,
                        UnitOfMeasurement: { Code: "IN" }
                    },
                    PackageWeight: {
                        Weight: packageDetails.weight,
                        UnitOfMeasurement: { Code: "LBS" }
                    }
                }
            }
        }
    };

    try {
        const response = await axios.post('https://onlinetools.ups.com/rest/Ship', requestBody, {
            auth: {
                username: upsUsername,
                password: upsPassword,
            },
            headers: {
                'Content-Type': 'application/json',
                'AccessLicenseNumber': upsApiKey,
            }
        });

        console.log('Shipping Label Created:', response.data);
        return response.data;
    } catch (error) {
        if (error.response) {
            // If the error is a response from UPS, log its details
            console.error('UPS API Error:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers,
            });
        } else {
            // Log general error if no response
            console.error('Error creating shipping label:', error.message);
        }
        throw error; // Handle the error as needed
    }
};

const checkOrderIdAlreadyExist = async (orderId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT COUNT(*) AS count FROM order_info WHERE shoipfy_order_id = ?`;
        const params = [orderId];

        db_con.query(query, params, (err, result) => {
            if (err) {
                console.error("SQL Error:", err.message);
                return reject(new Error('Internal server error'));
            }

            // Check the count from the result
            const exists = result[0].count > 0;
            resolve(exists); // Return true if it exists, false if it does not
        });
    });
};

const getProductDetails  = async (series_num ) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT   * 

                       FROM wp_serial_search AS main
                         WHERE 
                          series_num = ?
                         AND price = (
                             SELECT MAX(price)
                             FROM wp_serial_search
                             WHERE series_num = main.series_num      
                           
                         ) limit 1`;

                const value = [series_num] ;        
        
        db_con.query(query, value , (err, result) => {
            if (err) {
                //console.error("SQL Error:", err.message);
                return reject(new Error('Internal server error'));
            }
            //console.log(result, 'result is here');
            resolve(result);
        });
    });
};



const createOrderInWordpress = async (price, shipping, customer, totalPrice, eligibleItemsSendToWordpress) => {
    try {
        const wordpress = await wordpressToken();
        const key = wordpress[0]['key'];
        const secret = wordpress[0]['secret'];
        const shop = wordpress[0]['shop'];
        const api_version = wordpress[0]['api_version'];

        console.log("wordpress", wordpress);

        const numericTotalPrice = parseFloat(totalPrice.replace(/[$,]/g, ''));
        console.log("eligibleItemsSendToWordpress", eligibleItemsSendToWordpress);

        // Prepare line_items for WooCommerce order
        const line_items = Array.isArray(price.line_items)
            ? price.line_items.map((item, idx) => {
                const metaData = [
                  ...Object.entries(item.meta_data || {})
                    .filter(([key, value]) => value !== undefined && value !== '$undefined')
                    .map(([key, value]) => ({ key, value })),
                  {
                    key: 'tradeInType',
                    value: 'Cart Drawer'
                  }
                ];
                return {
                    name: item.title_product,
                    product_id: 7413, // You may want to map product_id dynamically
                    variation_id: 0,
                    quantity: item.quantity || 1,
                    subtotal: (parseFloat(item.totalPrice || 0)).toFixed(2),
                    total: (parseFloat(item.totalPrice || 0)).toFixed(2),
                    total_tax: "0.00",
                    taxes: [],
                    meta_data: metaData
                };
            })
            : [];

        // Dynamically set shipping and billing addresses
        const shippingAddress = {
            first_name: shipping.first_name || "John",
            last_name: shipping.last_name || "Doe",
            address_1: shipping.address_1 || "969 Market",
            address_2: shipping.address_2 || "",
            city: shipping.city || "San Francisco",
            state: shipping.state || "CA",
            postcode: shipping.postcode || "94103",
            country: shipping.country || "US"
        };

        const billingAddress = {
            first_name: customer.billing.first_name || "John",
            last_name: customer.billing.last_name || "Doe",
            address_1: customer.billing.address_1 || "969 Market",
            address_2: customer.billing.address_2 || "",
            city: customer.billing.city || "San Francisco",
            state: customer.billing.state || "CA",
            postcode: customer.billing.postcode || "94103",
            country: customer.billing.country || "US",
            email: customer.billing.email || "email@example.com",
            phone: customer.billing.phone || "(555) 555-5555"
        };

        const orderData = {
            payment_method: "bacs",
            payment_method_title: "Direct Bank Transfer",
            set_paid: true,
            billing: billingAddress,
            shipping: shippingAddress,
            line_items: line_items,
            total: numericTotalPrice.toFixed(2),
            shipping_method: [
                {
                    "ph_ups_shipping": "03"
                }
            ]
        };

        const response = await axios.post(
            `https://${shop}/${api_version}/orders`,
            orderData,
            {
                auth: {
                    username: key,
                    password: secret
                },
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        console.log('Order Created:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating order:', error.response ? error.response.data : error.message);
        throw false;
    }
};


const createOrder = async (price, order, variantID) => {
    try {
        const accessTokenUnsoretd = await getToken();
        const accessToken = accessTokenUnsoretd[0]['info'];
        const shop = accessTokenUnsoretd[0]['shop'];

        // Define the order object
        const orderData = {
            order: {
                line_items: [
                    {
                        variant_id: variantID, // The variant ID from the product you added
                        quantity: 1, // Number of items ordered
                    },
                ],
                email: order.email, // Assuming the order object has an email property for the customer
                /* shipping_address: {
                    first_name: order.tst,
                    last_name: order.lastName,
                    address1: order.address1,
                    city: order.city,
                    province: order.province,
                    country: order.country,
                    zip: order.zip,
                }, */
                shipping_address: {
                    first_name: "sat",
                    last_name: "last",
                    address1: "gdgd",
                    city: "delhi ",
                    province: "delhi",
                    country: "India",
                    zip: "160103",
                },


                financial_status: "paid", // Set to 'paid' if payment has been received
                total_price: price,
                currency: "USD", // Adjust to your currency
            },
        };

        // Create the order
        const createOrderResponse = await axios.post(
            `https://${shop}/admin/api/2023-04/orders.json`,
            orderData,
            {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Return order details
        return createOrderResponse.data.order; // Return the new order details
    } catch (error) {
        if (error.response) {
            //console.error(`Failed to create order: ${error.response.data.errors ? JSON.stringify(error.response.data.errors) : error.response.data} during the ${error.config.url} request`);
            throw new Error(`Failed to create order: ${error.response.data.errors ? JSON.stringify(error.response.data.errors) : error.response.data}`);
        } else {
           // console.error(`Failed to create order: ${error.message} in createOrder function`);
            throw new Error(`Failed to create order: ${error.message}`);
        }
    }
};
TestController.index2 = async (req, res) => {
    try {
        let query;
         let values = [];
 
         const { series, series_num, screen_size, release_year, processor_model } = req.query;
         const numericScreenSize = screen_size ? Number(screen_size) : null;
         const numericReleaseYear = release_year ? Number(release_year) : null;
         const lowerCaseSeries = series ? series.toLowerCase() : null;
    
        

         if (series && series_num && numericScreenSize && numericReleaseYear && processor_model) {
            // Fetch the data from the API
            const response = await fetch('https://sellmac.cybersify.tech/sellapi/wp-json/custom/v1/ram_storage_pricing');
            const data = await response.json();
            

        
            if (response.ok && data && data.ram_and_storage) {
                const ramData = data?.ram_and_storage?.ram || {};
                    const storageData = data?.ram_and_storage?.storage || {};

                const lowerCaseSeriesNum = series_num.toLowerCase();
                const result = { ram: [], storage: [] };
        
                // Process RAM data
               /*  if(series !== "iPad"){
                    console.log("ipad no"); */
                    if (ramData[lowerCaseSeriesNum]) {
                        const ramPricing = ramData[lowerCaseSeriesNum][numericReleaseYear];
                        if (ramPricing) {
                            result.ram = ramPricing.split(',');
                        } else {
                            return res.status(404).json({ error: `No RAM pricing available for the year ${numericReleaseYear}.` });
                        }
                    }
             /*    }else{
                    console.log("ipad yes");

                } */
                
        
                // Process Storage data
                if (storageData[lowerCaseSeriesNum]) {
                    const storagePricing = storageData[lowerCaseSeriesNum][numericReleaseYear];
                    if (storagePricing) {
                        result.storage = storagePricing.split(',');
                    } else {
                        return res.status(404).json({ error: `No Storage pricing available for the year ${numericReleaseYear}.` });
                    }
                }
        
                const queryAlldata = `SELECT * 
                FROM wp_serial_search AS main
                WHERE series_num = ? 
                AND screen_size = ? 
                AND release_year = ? 
                AND processor_model = ? 
                AND price = (
                    SELECT MAX(price) 
                    FROM wp_serial_search 
                    WHERE series_num = main.series_num 
                    AND screen_size = main.screen_size 
                    AND release_year = main.release_year 
                    AND processor_model = main.processor_model
                )
                GROUP BY order_num;`;
                
                const values = [series_num, numericScreenSize, numericReleaseYear, processor_model];
        
                // First query to get all data related to the series
                db_con.query(queryAlldata, values, (error, resultsAlldata) => {
                    if (error) {
                        console.error('Error executing query: ', error);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    console.log('Distinct Processor Models:', resultsAlldata);
                   
                    
        
                    const deviceDataQuery = `SELECT device_values ,type FROM devices_info WHERE device_name = ?`;
                const deviceValues = [lowerCaseSeries]; // Correct variable for the query
        
                    // Execute the SQL query to get extra device info
                    db_con.query(deviceDataQuery, deviceValues, (err, resultSeries) => {
                        if (err) {
                            console.error("SQL Error:", err.message);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        //console.log("testing the  resultSeries", resultSeries);
                        // Parse device_values to convert it from a string to an object
                        const parsedResultSeries = resultSeries.map(item => {
                            return {
                                ...item,
                                device_values: JSON.parse(item.device_values)
                                // Ensure device_values can be parsed
                            };
                        });

                        // Return the response with all the data collected
                        return res.status(200).json({ storage: result, extra_info: parsedResultSeries, product_info: resultsAlldata ,additionalPrices: {
                            carrier: data.carrier,
                            condition:data.condition,
                            accessories_price:data.accessories_price,
                            battery:data.battery
                        }

                        });
                    });
                });
        
                return; // Ensure no further responses are sent after this point
            } else {
                return res.status(500).json({ error: 'Failed to fetch or parse RAM and storage pricing data.' });
            }
        }

        // Handle other query cases...
        if (series && series_num && numericScreenSize && numericReleaseYear) {
            query = `SELECT DISTINCT processor_model 
                     FROM wp_serial_search 
                     WHERE series_num = ? AND screen_size = ? AND release_year = ?`;
            values = [series_num, numericScreenSize, numericReleaseYear];
        } else if (series && series_num && numericScreenSize) {
            query = `SELECT DISTINCT release_year 
                     FROM wp_serial_search 
                     WHERE series_num = ? AND screen_size = ?`;
            values = [series_num, numericScreenSize];
        } else if (series  && series_num) {
            if (series === "iPhone") {
                try {

                    const productData = await getProductDetails(series_num);
                    const response = await fetch('https://sellmac.cybersify.tech/sellapi/wp-json/custom/v1/ram_storage_pricing');
                    const data = await response.json();
        
                    const seriesNumLowercase = series_num.toLowerCase();
                    console.log("Series number (lowercase):", seriesNumLowercase);
        
                    const storage = data.ram_and_storage.storage;
                    console.log(storage, "Storage data");
        
                    // Check if the storage for the specific model exists
                    if (storage && storage[seriesNumLowercase]) {
                        const modelStorage = storage[seriesNumLowercase];
                        console.log(modelStorage, "Model storage options");
        
                        return res.status(200).json({
                            status: 200,
                            data:{
                                storage: modelStorage,
                                condition: data.condition,
                                accessories_price: data.accessories_price,
                                battery: data.battery,
                                carrier: data.carrier,
                                productData:productData
                            }
                           
                        });
                    } else {
                        return res.status(404).json({ 
                            statos :400,
                            error: "Storage options not found for this model." });
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                    return res.status(500).json({ 
                        status : 500,
                        error: "An error occurred while fetching storage data."
                     });
                }
            } else {
                console.log("hello",);
                const query = `
                    SELECT DISTINCT screen_size 
                    FROM wp_serial_search 
                    WHERE series_num = ?`;
                  const values = [series_num];
                  db_con.query(query, values, (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: err});
                    }
        
                    return res.status(200).json({ status: 200, data: result });
                });
        
                // Continue with the database query logic...
            }
            return;
        } else if (series) {

            if(series == "iPhone"){
             // Check if the device exists in the devices_info table
            const deviceDataQuery = `SELECT type FROM devices_info WHERE device_name = ?`;
            db_con.query(deviceDataQuery, [series], (err, deviceResult) => {
                if (err) {
                    return res.status(500).json({ error: 'Internal server error' });
                }

                console.log("deviceResult123",)

                if (deviceResult.length > 0) {
                    // If device data exists, proceed with the series_num query
                    const query = `SELECT DISTINCT series_num 
                        FROM wp_serial_search 
                        WHERE 
                            (series_num LIKE 'iPhone %' AND 
                            SUBSTRING_INDEX(series_num, ' ', -1) REGEXP '^[0-9]+$' AND 
                            CAST(SUBSTRING_INDEX(series_num, ' ', -1) AS UNSIGNED) > 6)
                            OR
                            (series_num LIKE 'iPhone %' AND 
                            series_num NOT REGEXP ' [0-9]+$') 
                        ORDER BY 
                            CASE 
                                WHEN SUBSTRING_INDEX(series_num, ' ', -1) REGEXP '^[0-9]+$' 
                                    AND CAST(SUBSTRING_INDEX(series_num, ' ', -1) AS UNSIGNED) > 6 THEN 1 
                                ELSE 2 
                            END,
                            series_num;

                                            `;
                    const values = [series];

                    db_con.query(query, values, (err, result) => {
                     const filterData = [];
                    const unwantedSeries = [
                        "iPhone 5c",
                        "iPhone 1st Generation",
                        "iPhone 4S",
                        "iPhone 3G",
                        "iPhone 3GS",
                        "iPhone 5S",
                        "iPhone 6 Plus"
                    ];
                    result.forEach(result1 => {
                        if (!unwantedSeries.includes(result1.series_num)) {
                            filterData.push(result1);
                        }
                    });
                        console.log(typeof(result));
                        if (err) {
                            return res.status(500).json({ error: 'Internal server error' });
                        }

                        return res.status(200).json({ status: 200, data: filterData  ,type : deviceResult});
                    });
                } else {
                    // If no device data is found
                    return res.status(404).json({ status: 404, error: 'Device not found' });
                }
            });

            }else{
                const deviceDataQuery = `SELECT type FROM devices_info WHERE device_name = ?`;

            db_con.query(deviceDataQuery, [series], (err, deviceResult) => {
                if (err) {
                    return res.status(500).json({ error: 'Internal server error' });
                }

                console.log("deviceResult123",)

                if (deviceResult.length > 0) {
                    // If device data exists, proceed with the series_num query
                    const query = `SELECT DISTINCT series_num 
                                   FROM wp_serial_search 
                                   WHERE SUBSTRING_INDEX(series_num, ' ', 1) = ?`;
                    const values = [series];

                    db_con.query(query, values, (err, result) => {
                        if (err) {
                            return res.status(500).json({ error: 'Internal server error' });
                        }

                        return res.status(200).json({ status: 200, data: result  ,type : deviceResult});
                    });
                } else {
                    // If no device data is found
                    return res.status(404).json({ status: 404, error: 'Device not found' });
                }
            });

            }
            return; // Prevent further processing
        } else {
            query = `SELECT 
                     SUBSTRING_INDEX(series_num, ' ', 1) AS series, 
                     img_url, 
                     COUNT(*) AS count 
                 FROM wp_serial_search
                 WHERE SUBSTRING_INDEX(series_num, ' ', 1) IN ('MacBook', 'iMac', 'iPad', 'iPhone', 'Mac', 'Watch')
                 GROUP BY series 
                 ORDER BY count DESC`;
        }

        // Execute the SQL query if not already handled
        db_con.query(query, values, (err, result) => {
            if (err) {
                return res.status(500).json({ error: err});
            }

            return res.status(200).json({ status: 200, data: result });
        });

    } catch (err) {
        return res.status(500).json({ error: err.message});
    }
};

TestController.price = async (req, res) => {
    try {
        const { price, title, order, variantID } = req.body;

        // Check if price and title are provided
        if (!price || !title) {
            return res.status(400).json({ error: 'Price and title are required.' });
        }

        //console.log("ordr",order);

        // If order is provided, create the order
        if (order && variantID) {
           
             const orderCreated = await createOrder(price, title, order, variantID); // Call to create order
            return res.status(201).json({ 
                status: 201,
                message: "Order created successfully",
                order: orderCreated 
            }); 
        } else {
           // console.log("no");
            // If order is missing, create the product
             const variantDetails = await addProduct(price, title); // Call to create product
            return res.status(200).json({ 
                variant: variantDetails,
                message: "Product created successfully, but no order was placed."
            });  
        }
    } catch (error) {
        //console.error('Price error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const addProduct = async (price, title) => {
    try {
        const accessTokenUnsoretd = await getToken();
        const accessToken = accessTokenUnsoretd[0]['info'];
        const collectionID = 505992610103;
        const originalPrice = price;
        const productTitle = title;

        // 1. Create a new product
        const createProductResponse = await axios.post(
            `https://rohit-cybersify.myshopify.com/admin/api/2023-04/products.json`,
            {
                product: {
                    title: productTitle,
                    body_html: "<strong>Product Description</strong>",
                    vendor: "Your Vendor",
                    product_type: "Default Type",
                    variants: [
                        {
                            option1:  productTitle,
                            price: originalPrice,
                            sku: "new-product-sku",
                            inventory_quantity: 0,
                        },
                    ],
                },
            },
            {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }
        );

        const newProductID = createProductResponse.data.product.id;
        const newVariantID = createProductResponse.data.product.variants[0].id;

        // 2. Add the product to a specific collection
        await axios.post(
            `https://rohit-cybersify.myshopify.com/admin/api/2023-04/collects.json`,
            {
                collect: {
                    product_id: newProductID,
                    collection_id: collectionID,
                },
            },
            {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }
        );

        // 3. Associate the discount with the product
        await axios.post(
            `https://rohit-cybersify.myshopify.com/admin/api/2023-04/variants/${newVariantID}/metafields.json`,
            {
                metafield: {
                    namespace: "discounts",
                    key: "discount_id",
                    value: "1472967573815",
                    value_type: "string",
                    type: "single_line_text_field" // Specify the type here
                },
            },
            {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Return variant details
        return createProductResponse.data.product.variants[0]; // Return the new variant details
    } catch (error) {
        if (error.response) {
            //console.error(`Failed to add product: ${error.response.data.errors ? JSON.stringify(error.response.data.errors) : error.response.data} during the ${error.config.url} request`);
            throw new Error(`Failed to add product: ${error.response.data.errors ? JSON.stringify(error.response.data.errors) : error.response.data}`);
        } else {
            //console.error(`Failed to add product: ${error.message} in addProduct function`);
            throw new Error(`Failed to add product: ${error.message}`);
        }
    }
};
const checkEligibility = async (note) => {
    if (!note || note.trim() === '') {
        return {
            status: 200,
            message: false,
            details: 'No eligibility due to empty note.'
        };
    }

    const lines = note.split('\n');
    const products = [];
    let currentProduct = {};

    const flushProduct = () => {
        // Only flush if product has a title and code (or other required fields)
        if (currentProduct && Object.keys(currentProduct).length && currentProduct.productTitle && currentProduct.code) {
            products.push({ ...currentProduct });
        }
    };

    lines.forEach(line => {
        if (line.includes('Product Title:')) {
            flushProduct();
            currentProduct = { productTitle: line.split(':')[1].trim() };
        } else if (line.includes('Code:')) {
            currentProduct.code = line.split(':')[1].trim();
        } else if (line.includes('Sellable:')) {
            currentProduct.sellable = line.split(':')[1].trim();
        } else if (line.includes('Image URL:')) {
            // If the URL is on the same line
            let url = line.substring(line.indexOf(':') + 1).trim();
            if (!url) {
                // If empty, check the next line
                const nextLineIndex = lines.indexOf(line) + 1;
                if (nextLineIndex < lines.length) {
                    url = lines[nextLineIndex].trim();
                }
            }
            currentProduct.imageUrl = url;
        }else if (line.includes('Visual Condition:')) {
            currentProduct.visualCondition = line.split(':')[1].trim();
        } else if (line.includes('Battery Condition:')) {
            currentProduct.batteryCondition = line.split(':')[1].trim();
        } else if (line.includes('Device Type:')) {
            currentProduct.deviceType = line.split(':')[1].trim();
        } else if (line.includes('Total Price:')) {
            currentProduct.totalPrice = line.split(':')[1].trim();
        } else if (line.includes('Base Price')) {
            currentProduct.basePrice = line.split(':')[1].trim();
        } else if (line.includes('Accessories:')) {
            currentProduct.accessoroes = line.split(':')[1].trim();
        } else if (line.includes('RAM:')) {
            currentProduct.ram = line.split(':')[1].trim();
        } else if (line.includes('Storage:')) {
            currentProduct.storage = line.split(':')[1].trim();
        }else if(line.includes('functional')){
            if (line.split(':')[1].trim() == '100functional') {
                currentProduct.functional = 'Full Functionality';
            } else if (line.split(':')[1].trim() == 'fucntionalissues') {
                currentProduct.functional = 'Has Issues';
            }
        }
    });
    flushProduct(); // Push the last product

    if (products.length > 0) {
        return {
            status: 200,
            message: true,
            details: products
        };
    } else {
        return {
            status: 200,
            message: false,
            details: 'No eligible products found.'
        };
    }
};
const getVariantidDetails = async (variantId) => {
    try {
        // Retrieve the access token and shop information
        const accessTokenUnsoretd = await getToken();
        const accessToken = accessTokenUnsoretd[1]['info'];
        const shop = accessTokenUnsoretd[1]['shop'];

        // Define the API URL for fetching variant details
        const url = `https://${shop}/admin/api/2024-01/variants/${variantId}.json`;

        // Make the API request to get the variant details
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });

        // Check if the response is OK (status 200)
        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        // Parse the JSON response
        const data = await response.json();
        return data.variant; // Return the variant details
    } catch (error) {
        console.error('Failed to fetch variant details:', error);
    }
};




TestController.webhook1 = async (req, res) => {
    try {
         // Check if the store URL matches the specified one
         if (req.headers['x-shopify-shop-domain'] !== '7f2756-2.myshopify.com' && req.headers['x-shopify-shop-domain']!="techable.com" ) {
            console.log("Webhook received from an unauthorized store.",req.headers['x-shopify-shop-domain']);
            return res.status(403).json({ status: 403, message: 'Unauthorized store.' });
        }
        const orderData = req.body;
        console.log("checkOrder",orderData,)
        const orderId = orderData.id;
        const note = orderData.note;
        console.log("order_order",orderId);

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        // Delay for 3 seconds before checking the order ID
        await delay(3000);

        const orderIdCheck = await checkOrderIdAlreadyExist(orderId);

        if (orderIdCheck) {
            console.log("alreday");
            return res.status(200).json({ status: 200 });  
        }

        const checkeligibleItems =  await checkEligibility(note)
        if(checkeligibleItems.message == false || !Array.isArray(checkeligibleItems.details) || checkeligibleItems.details.length === 0){
            console.log("false message or no products");
            return res.status(200).json({ status: 200 });
        }

        // Prepare line_items for all products with robust price parsing
        const line_items = checkeligibleItems.details.map(product => {
            // Use regex to strip non-numeric except decimal
            const parsedPrice = parseFloat((product.totalPrice || '0').replace(/[^\d.]/g, ''));
            return {
                quantity: 1,
                title_product: product.productTitle,
                totalPrice: parsedPrice.toFixed(2),
                meta_data: product // send all product info for meta_data
            };
        });

        // Calculate total price for all products
        const totalPrice = line_items.reduce((sum, item) => {
            const price = parseFloat(item.totalPrice);
            return sum + (isNaN(price) ? 0 : price);
        }, 0).toFixed(2);

        // Debug logs
        console.log('Parsed products:', checkeligibleItems.details);
        console.log('Line items being sent to WordPress:', line_items);
        console.log('Order total being sent to WordPress:', totalPrice);

        const price = {
            line_items
        };

        const shipping = {
            first_name: orderData.shipping_address.first_name,
            last_name: orderData.shipping_address.last_name,
            address_1: orderData.shipping_address.address1,
            address_2: orderData.shipping_address.address2,
            city: orderData.shipping_address.city,
            state: orderData.shipping_address.province,
            postcode: orderData.shipping_address.zip,
            country: orderData.shipping_address.country,
            total: totalPrice // Use calculated total price
        };

        const customer = {
            billing: {
                first_name: orderData.billing_address.first_name,
                last_name: orderData.billing_address.last_name,
                address_1: orderData.billing_address.address1,
                address_2: orderData.billing_address.address2,
                city: orderData.billing_address.city,
                state: orderData.billing_address.province,
                postcode: orderData.billing_address.zip,
                country: orderData.billing_address.country,
                email: orderData.contact_email,
                phone: orderData.billing_address.phone
            }
        };
        // Create the order in WordPress
        const createdOrder = await createOrderInWordpress(price, shipping, customer, totalPrice, checkeligibleItems.details);

        if(createdOrder){
            console.log("createdOrder",createdOrder);
        }else{
            return res.status(200).json({ error: 'Internal server error' });
        }

        const orderInfo = {
            shopify_order_id: orderData.id || null,
            shipping_order_info: orderData ? JSON.stringify(orderData) : null,
            wordpress_order_id: createdOrder ? createdOrder.id : null,
            wordpress_order_info: createdOrder ? JSON.stringify(createdOrder) : null
        };

      const orderSaveToDatabase =   await saveOrderInfoToDatabase(orderInfo);
      if(orderSaveToDatabase){
        console.log(orderSaveToDatabase ,"orderSaveToDatabase");
      }

        return res.status(200).json({ status: 200 });
    } catch (error) {
        console.error('Error handling webhook:', error);
        return res.status(200).json({ error: 'Internal server error' });
    }
};
TestController.deviceInfo  = async(req, res)=>{

    try{
        const data = await new Promise((resolve, reject) => {
            const sqlQuery = "SELECT * FROM  devices_info"
             db_con.query(sqlQuery, (err, result) => {
               if (err) {
                 console.error("SQL Error:", err.message);
                 reject(err.message); // Reject the promise on error
               } else {
              
                resolve(result);
               }
             });
           });
           console.log(data,'data')
           res.status(200).json({
              status : 200,
              data
           })
    } catch(error){ 
        res.status(500).json({
             status : 500,
             message : error.message
        })
    }
  
  
}

TestController.deviceInfoEdit = async (req, res) => {
    console.log("hello");
    const { id, specialPrice } = req.body; // Assuming id and specialPrice are sent in the request body

    if (!id || specialPrice === undefined) { // Check for missing parameters
        return res.status(400).json({
            status: 400,
            message: "ID and specialPrice are required."
        });
    }

    try {
        // Use a promise to handle the SQL query
        const updatedDeviceInfo = await new Promise((resolve, reject) => {
            const sqlQuery = "UPDATE devices_info SET specailPricce = ? WHERE id = ?";
            const params = [specialPrice, id];

            db_con.query(sqlQuery, params, (err, result) => {
                if (err) {
                    console.error("SQL Error:", err.message);
                    reject(err.message); // Reject the promise on error
                } else {
                    resolve(result); // Resolve with the result if no error
                }
            });
        });

        // Check if any row was affected
        if (updatedDeviceInfo.affectedRows === 0) {
            return res.status(404).json({
                status: 404,
                message: "Device not found."
            });
        }

        // Return success response
        return res.status(200).json({
            status: 200,
            message: "Special price updated successfully."
        });

    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: error.message
        });
    }
};

TestController.orderInfo = async (req, res) => {
    try {
        const sqlQuery = "SELECT * FROM order_info";
        
        // Using a promise-based approach directly with async/await
        const result = await new Promise((resolve, reject) => {
            db_con.query(sqlQuery, (err, result) => {
                if (err) {
                    
                    return reject(new Error("Database query failed"));
                }
                resolve(result);
            });
        });

       
        return res.status(200).json({
            status: 200,
            data: result,
        });
        
    } catch (error) {
        console.error("Error fetching order info:", error.message);
        return res.status(500).json({
            status: 500,
            message: error.message,
        });
    }
};



export default TestController ;
