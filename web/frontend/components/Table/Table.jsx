import React from "react";

const Table = ({ data, headData }) => {
  return (
    <>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {headData.map((head) => (
              <>
                <th>{head?.id}</th>
                <th>{head?.name}</th>
                <th>{head?.price}</th>
                <th>{head?.value}</th>
                <th>{head?.type}</th>
                <th>{head?.order}</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={index}>
                <td>{item?.id
                }</td>
                <td>{item?.device_name}</td>
                <td>{item?.specailPricce}</td>
                <td>{item?.device_values}</td>
                <td>{item?.type}</td>
                <td>{item?.shoipfy_order_id}</td>
                <td>{item?.wordpress_order_id}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

export default Table;
