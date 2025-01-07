import React from 'react';
import useFetch from '../hooks/useFetch';
import Table from '../components/Table/Table';
const headData = [
    {id: "ID",name: 'Name', price: 'Special Price', value:  'Values', type: 'Type' },
]
const dashboard = () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const { data, loading, error } = useFetch('/api/devices-info', options);

  console.log(data, 'result')


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
export default dashboard;