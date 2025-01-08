import React from "react";
import "./table.css";

const Table = ({ data = [], headData = [] }) => {
    console.log("data", data);

  return (
    <>
      <table style={{ borderCollapse: "collapse" }} className="tablePadding">
        <thead>
          <tr>
            {headData.map((head, index) => (
              <React.Fragment key={index}>
                <th>{head?.id}</th>
                <th>{head?.name}</th>
                {/* <th>{head?.price}</th>
                <th>{head?.value}</th>
                <th>{head?.type}</th> */}
                <th>{head?.order}</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={index}>
                  {console.log(item,"sdsa")}
                <td>{item?.id}</td>
                <td>{item?.shopify_order_id}</td>
                {/* <td>{item?.device_name}</td>
                <td>{item?.specialPrice}</td>
                <td>{item?.device_values}</td>
                <td>{item?.type}</td> */}
                <td>{item?.wordpress_order_id}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headData.length || 6}>No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

export default Table;
