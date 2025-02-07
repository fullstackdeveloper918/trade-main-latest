import db_con from "../../db.js";
import axios from "axios";

const DataController = {};

const getToken = async () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT info ,shop FROM enkto`;
        db_con.query(query, (err, result) => {
            if (err) {
                console.error("SQL Error:", err.message);
                return reject(new Error('Internal server error'));
            }
            console.log(result, 'result is here');
            resolve(result);
        });
    });
};

const getProductDetails = async (series_num) => {
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

        const value = [series_num];

        db_con.query(query, value, (err, result) => {
            if (err) {
                //console.error("SQL Error:", err.message);
                return reject(new Error('Internal server error'));
            }
            //console.log(result, 'result is here');
            resolve(result);
        });
    });
};

DataController.index = async (req, res) => {
    try {
        let query;
        let values = [];

        const { series, series_num, screen_size, release_year, processor_model, network } = req.query;
        const numericScreenSize = screen_size ? Number(screen_size) : null;
        console.log("numericScreenSize", numericScreenSize);
        console.log("type", typeof (numericScreenSize));
        const numericReleaseYear = release_year ? Number(release_year) : null;
        const lowerCaseSeries = series ? series.toLowerCase() : null;
        let networkfi = network ? network : null;


        if (series && series_num && numericScreenSize && numericReleaseYear && processor_model || series && series_num && numericScreenSize && numericReleaseYear && networkfi) {
          
            console.log('top',series_num);
            // Fetch the data from the API
            const response = await fetch('https://sellmac.com/wp-json/custom/v1/ram_storage_pricing');
            const data = await response.json();
            if (response.ok && data && data.ram_and_storage) {
                const ramData = data.ram_and_storage.ram || {};
                const storageData = data.ram_and_storage.storage || {};
                const lowerCaseSeriesNum = series_num.toLowerCase();
                const result = { ram: [], storage: [] };

                // Process RAM data
                if (ramData[lowerCaseSeriesNum]) {
                    const ramPricing = ramData[lowerCaseSeriesNum][numericReleaseYear];
                    if (ramPricing) {
                        result.ram = ramPricing.split(',');
                    } else {
                        return res.status(404).json({ error: `No RAM pricing available for the year ${numericReleaseYear}.` });
                    }
                }

                // Process Storage data
                if (storageData[lowerCaseSeriesNum]) {
                    const storagePricing = storageData[lowerCaseSeriesNum][numericReleaseYear];
                    if (storagePricing) {
                        result.storage = storagePricing.split(',');
                    } else {
                        return res.status(404).json({ error: `No Storage pricing available for the year ${numericReleaseYear}.` });
                    }
                }
                let queryAlldata;
                let values;
                if (series === "iPad") {
                    networkfi = (networkfi == 2) ? "Wifi + Cellular" : "Wifi";
                    queryAlldata = `
                        SELECT * 
                        FROM wp_serial_search AS main
                        WHERE series_num = ? 
                        AND screen_size = ? 
                        AND release_year = ? 
                        AND network = ?
                        AND price = (
                            SELECT MAX(price) 
                            FROM wp_serial_search 
                            WHERE series_num = main.series_num 
                            AND screen_size = main.screen_size 
                            AND release_year = main.release_year 
                            AND network = main.network 
                        )
                        GROUP BY order_num;
                    `;

                    // Use the following for the query values
                    values = [series_num, numericScreenSize, numericReleaseYear, networkfi];
                }else if(series === "Mac"){
                    console.log('serias_main',series);
                    queryAlldata = `
                    SELECT * 
FROM wp_serial_search AS main
WHERE series_num = ?  -- Replace '?' with the actual value or parameter
AND (screen_size = 1 OR screen_size = 0 OR screen_size IS NULL) 
AND release_year = ?  -- Replace '?' with the actual value or parameter
AND price = (
    SELECT MAX(price) 
    FROM wp_serial_search 
    WHERE series_num = main.series_num 
    AND screen_size = main.screen_size 
    AND release_year = main.release_year
)
GROUP BY order_num;`


                // Use the following for the query values
                values = [series_num, numericScreenSize, numericReleaseYear];
                 
                }

                else {
                    queryAlldata = `SELECT * 
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

                    values = [series_num, numericScreenSize, numericReleaseYear, processor_model];
                
                }



                // First query to get all data related to the series
                return new Promise((resolve, reject) => {
                    db_con.query(queryAlldata, values, (error, resultsAlldata) => {
                        if (error) {
                            console.error('Error executing query: ', error);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        console.log('Distinct Processor Models:', resultsAlldata);
                        console.log(resultsAlldata)
                        console.log('dddddddddddddddddddddd');

                        const deviceDataQuery = `SELECT device_values ,type FROM devices_info WHERE device_name = ?`;
                        const deviceValues = [lowerCaseSeries]; // Correct variable for the query

                        // Execute the SQL query to get extra device info
                        db_con.query(deviceDataQuery, deviceValues, (err, resultSeries) => {
                            if (err) {
                                console.error("SQL Error:", err.message);
                                return res.status(500).json({ error: 'Internal server error' });
                            }
                            console.log("testing the  resultSeries", resultSeries);

                            // Parse device_values to convert it from a string to an object
                            const parsedResultSeries = resultSeries.map(item => {
                                return {
                                    ...item,
                                    device_values: JSON.parse(item.device_values)
                                    // Ensure device_values can be parsed
                                };
                            });

                            // Return the response with all the data collected
                            return res.status(200).json({
                                storage: result, extra_info: parsedResultSeries, product_info: resultsAlldata, additionalPrices: {
                                    carrier: data.carrier,
                                    condition: data.condition,
                                    accessories_price: data.accessories_price,
                                    battery: data.battery
                                }

                            });
                        });
                    });
                });

                // Ensure no further responses are sent after this point
            } else {
                return res.status(500).json({ error: 'Failed to fetch or parse RAM and storage pricing data.' });
            }
        }

        // Handle other query cases...
        if (series && series_num && numericScreenSize && numericReleaseYear || series && series_num && numericScreenSize && networkfi) {
            if (series === "Mac") {
                console.log("series_num_1224", series_num)
                query = `SELECT DISTINCT processor_model 
                            FROM wp_serial_search 
                            WHERE series_num = ? 
                            AND release_year = ? 
                            AND (screen_size = 0 OR screen_size IS NULL or screen_size = 1)
                            `;
                values = [series_num, numericReleaseYear];
                return new Promise((resolve, reject) => {
                    db_con.query(query, values, (err, result) => {
                        if (err) {
                            return res.status(500).json({ error: err });
                        }

                        return res.status(200).json({ status: 200, data: result });
                    });

                });

            } else if (series === "iPad") {
                query = `SELECT DISTINCT network 
                FROM wp_serial_search 
                WHERE series_num = ? AND screen_size = ? AND release_year = ? order by network asc  `;
                values = [series_num, numericScreenSize, numericReleaseYear];

            }
            else {
                query = `SELECT DISTINCT processor_model 
                FROM wp_serial_search 
                WHERE series_num = ? AND screen_size = ? AND release_year = ? `;
                values = [series_num, numericScreenSize, numericReleaseYear];

            }

        } else if (series && series_num && numericScreenSize) {
            
            if (series === "Mac") {
                query = `SELECT DISTINCT release_year 
                FROM wp_serial_search 
                WHERE series_num = ?  and  release_year >= 2009 order by  release_year Asc`;
                values = [series_num];
                return new Promise((resolve, reject) => {
                    db_con.query(query, values, (err, result) => {
                        if (err) {
                            console.log("result123",result);
                            return res.status(500).json({ error: err });
                        }

                        return res.status(200).json({ status: 200, data: result });
                    });

                });


            }

            query = `SELECT DISTINCT release_year 
                     FROM wp_serial_search 
                     WHERE series_num = ? AND screen_size = ? and  release_year >= 2009 order by  release_year Asc`;
            values = [series_num, numericScreenSize];


        } else if (series && series_num) {
            if (series === "iPhone") {
                try {

                    const productData = await getProductDetails(series_num);
                    const response = await fetch('https://sellmac.com/wp-json/custom/v1/ram_storage_pricing');
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
                            data: {
                                storage: modelStorage,
                                condition: data.condition,
                                accessories_price: data.accessories_price,
                                battery: data.battery,
                                carrier: data.carrier,
                                productData: productData
                            }

                        });
                    } else {
                        return res.status(404).json({
                            statos: 400,
                            error: "Storage options not found for this model."
                        });
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                    return res.status(500).json({
                        status: 500,
                        error: "An error occurred while fetching storage data."
                    });
                }
            } else if (series === "Mac") {
                return res.status(200).json({
                    status: 200, data: [
                        {
                            screen_size: 0,
                        }
                    ]
                });

            }
            else {
                const query = `
                    SELECT DISTINCT screen_size 
                    FROM wp_serial_search 
                    WHERE series_num = ? order by screen_size asc`;
                const values = [series_num];
                db_con.query(query, values, (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: err });
                    }

                    return res.status(200).json({ status: 200, data: result });
                });


                // Continue with the database query logic...
            }
            return;
        } else if (series) {

            if (series == "iPhone") {
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
                            console.log(typeof (result));
                            if (err) {
                                return res.status(500).json({ error: 'Internal server error' });
                            }

                            return res.status(200).json({ status: 200, data: filterData, type: deviceResult });
                        });
                    } else {
                        // If no device data is found
                        return res.status(404).json({ status: 404, error: 'Device not found' });
                    }
                });

            } else if (series === "Watch") {
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
                                   WHERE series_num = ?`;
                        const values = ['Apple Watch'];

                        db_con.query(query, values, (err, result) => {
                            if (err) {
                                return res.status(500).json({ error: 'Internal server error' });
                            }

                            return res.status(200).json({ status: 200, data: result, type: deviceResult });
                        });
                    } else {
                        // If no device data is found
                        return res.status(404).json({ status: 404, error: 'Device not found' });
                    }
                });

            } else {
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

                            return res.status(200).json({ status: 200, data: result, type: deviceResult });
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
                 WHERE SUBSTRING_INDEX(series_num, ' ', 1) IN ('MacBook', 'iMac', 'iPad', 'iPhone', 'Mac', 'Watch','Apple vision pro')
                 GROUP BY series 
                 ORDER BY count DESC`;
        }

        // Execute the SQL query if not already handled
        return new Promise((resolve, reject) => {
            db_con.query(query, values, (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err });
                }

                return res.status(200).json({ status: 200, data: result });
            });

        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const addProduct = async (price, title) => {
    try {
        const accessTokenUnsoretd = await getToken();
        const accessToken = accessTokenUnsoretd[0]['info'];
        const shop = accessTokenUnsoretd[0]['shop'];
        const collectionID = 508644950327;
        //const collectionID = 482388377915 ; //for live


        const originalPrice = price;
        const productTitle = title;

        // 1. Create a new product
        const createProductResponse = await axios.post(
            `https://${shop}/admin/api/2023-04/products.json`,
            {
                product: {
                    title: productTitle,
                    body_html: "<strong>Product Description</strong>",
                    vendor: "Your Vendor",
                    product_type: "Default Type",
                    variants: [
                        {
                            option1: productTitle,
                            price: originalPrice,
                            sku: "new-product-sku",
                            inventory_quantity: 4,
                            inventory_policy: "continue",
                            inventory_management: "shopify",
                            requires_shipping: true,
                            weight: 1.0, // Add weight (in kilograms)
                            weight_unit: "kg" // Specify the unit of weight
                        },
                    ],
                    // Add this field if needed (but not all profiles can be managed via API)
                    shipping_profile_id: 117950513463 // Not supported

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
            `https://${shop}/admin/api/2023-04/collects.json`,
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
        /*   await axios.post(
              `https://${shop}/admin/api/2023-04/variants/${newVariantID}/metafields.json`,
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
          ); */

        // Return variant details
        return createProductResponse.data.product.variants[0]; // Return the new variant details
    } catch (error) {
        if (error.response) {
            console.error(`Failed to add product: ${error.response.data.errors ? JSON.stringify(error.response.data.errors) : error.response.data} during the ${error.config.url} request`);
            throw new Error(`Failed to add product: ${error.response.data.errors ? JSON.stringify(error.response.data.errors) : error.response.data}`);
        } else {
            console.error(`Failed to add product: ${error.message} in addProduct function`);
            throw new Error(`Failed to add product: ${error.message}`);
        }
    }
};


DataController.price = async (req, res) => {
    try {
        const { price, title } = req.body;
        const variantDetails = await addProduct(price, title); // Await the result

        // If everything is good, return the variant details
        return res.status(200).json({ variant: variantDetails });
    } catch (error) {
        console.error('Price error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


/*  DataController.webhook = async (req, res) => {
    try {
        // Log the entire request body for debugging
       // console.log('Webhook received:', req.body);
        // Send a success response
        return res.status(200).json({ status: 200 });
    } catch (error) {
        console.error('Error handling webhook:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}; 
 */









export default DataController;

