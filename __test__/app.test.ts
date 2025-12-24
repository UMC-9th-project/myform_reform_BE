test('통과하는 테스트', () => {
  const cal = 1 + 1;
  expect(cal).toBe(2);
});

test('틀리는 테스트', () => {
  const test = true;
  expect(test).toEqual(false);
});
