const GetSinglename = (name: string) => {
  const nameArray = name.split(" ");
  if (nameArray.length > 1) {
    return (
      nameArray[0].charAt(0).toUpperCase() + nameArray[0].slice(1).toLowerCase()
    );
  } else {
    return name;
  }
};

export default GetSinglename;
