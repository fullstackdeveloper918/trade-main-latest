import React from 'react';
import useFetch from '../hooks/useFetch';
import Table from '../components/Table/Table';
const headData = [
    {id: "ID",name: 'shopify Order Id', order: 'wordpress_order_id',
          },
]
const order = () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const { data, loading, error } = useFetch('/api/order-info', options);



  console.log(data, 'data')

 


  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  return (
    <>
     <Table data={data} headData={headData} />
    </>
  );
};
export default order;