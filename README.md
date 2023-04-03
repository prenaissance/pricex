# PriceX price aggregation

PriceX is a price aggregation service that collects prices from multiple e-commerce stores through web scraping and processes the data to provide an accurate price comparison.

## Provisioning

If the project will grow to a very complex scale, an Azure ARM template could be use for IaS. For now, the steps to be run in the Azure CLI are described here.

### Prerequisites

- Azure subscription
- Azure CLI installed (or cloud shell)

### Steps

1. Setup some env variables:

```bash
RESOURCE_GROUP_NAME=pricex
STORAGE_ACCOUNT_NAME=pricex
CONTAINER_NAME=products
LOCATION=westeurope
```

2. Create the resource group:

```bash
az group create --name $RESOURCE_GROUP_NAME --location $LOCATION
```

3. Create the storage account:

```bash
az storage account create --name $STORAGE_ACCOUNT_NAME --resource-group $RESOURCE_GROUP_NAME --location $LOCATION --sku Standard_LRS
```

4. Create the storage container:

```bash
az storage container create --name $CONTAINER_NAME --account-name $STORAGE_ACCOUNT_NAME
```

5. Get the storage account connection string:

```bash
az storage account show-connection-string --name $STORAGE_ACCOUNT_NAME --resource-group $RESOURCE_GROUP_NAME --query connectionString --output tsv
```

6. Create the storage queue:

```bash
az storage queue create --name $STORAGE_ACCOUNT_NAME --account-name $STORAGE_ACCOUNT_NAME
```

7. Move the connection string to the .env file:

```bash
echo "STORAGE_ACCOUNT_CONNECTION_STRING=$STORAGE_ACCOUNT_CONNECTION_STRING" >> .env
```
