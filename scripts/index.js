console.clear();
  console.time('Test');
  console.log('Hello World!');
  console.error('Oh no World! Something went wrong');
  console.warn('Hey World, be careful!');
  console.info('Psst, World, here\'s some info');
  console.table([{ message: 'Hello Table' }, { message: 'It\'s a Table' }]);
  console.timeEnd('Test');
  console.assert(false, 'Probably fine');