const FormatName = (name: string | undefined) => {
  if (!name) return "";
  const nameArray = name.split(" ");
  const formattedName: string[] = [];
  if (nameArray.length === 1) {
    return (
      nameArray[0].charAt(0).toUpperCase() + nameArray[0].slice(1).toLowerCase()
    );
  } else {
    nameArray.forEach((name) =>
      formattedName.push(
        name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      ),
    );
    return formattedName.join(" ");
  }
};

export default FormatName;
