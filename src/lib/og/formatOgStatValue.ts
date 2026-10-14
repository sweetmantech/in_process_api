const formatOgStatValue = (value: string, maximumFractionDigits = 2) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
};

export default formatOgStatValue;
