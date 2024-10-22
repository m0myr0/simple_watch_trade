function checkDependency(dependencyName) {
    try {
      require(dependencyName);
      console.log(`${dependencyName} is installed and ready to use.`);
    } catch (error) {
      console.error(`${dependencyName} is NOT installed. Error: ${error.message}`);
    }
  }
  
  const dependencies = ['pg', 'express', 'dotenv', 'axios'];
  
  dependencies.forEach(checkDependency);
  