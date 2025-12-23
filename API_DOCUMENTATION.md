# PropSift API Documentation

This document contains all the RapidAPI endpoints and code snippets used in this property search application.

---

## Setup

### Environment Variables

Create a `.env.local` file with:

```env
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=private-zillow.p.rapidapi.com
```

### Get Your RapidAPI Key

1. Go to [RapidAPI](https://rapidapi.com)
2. Create an account
3. Subscribe to the **Private Zillow** API
4. Copy your API key from the dashboard

---

## API Endpoints

### 1. Property Details by Address

**API:** Private Zillow  
**Host:** `private-zillow.p.rapidapi.com`  
**Endpoint:** `/pro/byaddress`  
**Method:** GET

#### Raw API Call (JavaScript)

```javascript
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;

xhr.addEventListener('readystatechange', function () {
  if (this.readyState === this.DONE) {
    console.log(this.responseText);
  }
});

xhr.open('GET', 'https://private-zillow.p.rapidapi.com/pro/byaddress?propertyaddress=1875%20AVONDALE%20Circle%2C%20Jacksonville%2C%20FL%2032205');
xhr.setRequestHeader('x-rapidapi-key', 'YOUR_API_KEY');
xhr.setRequestHeader('x-rapidapi-host', 'private-zillow.p.rapidapi.com');

xhr.send(null);
```

#### Next.js API Route

```typescript
// src/app/api/property/address/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address parameter is required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://${process.env.RAPIDAPI_HOST}/pro/byaddress?propertyaddress=${encodeURIComponent(address)}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
          'x-rapidapi-host': process.env.RAPIDAPI_HOST || '',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching property by address:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property data' },
      { status: 500 }
    )
  }
}
```

#### Response Structure

```json
{
  "message": "200: Success",
  "propertyDetails": {
    "zpid": 44480538,
    "streetAddress": "1875 AVONDALE Circle",
    "city": "Jacksonville",
    "state": "FL",
    "zipcode": "32205",
    "bedrooms": 7,
    "bathrooms": 5,
    "livingArea": 7526,
    "yearBuilt": 1925,
    "homeType": "SINGLE_FAMILY",
    "price": 4250000,
    "zestimate": 4161900,
    "originalPhotos": [...]
  }
}
```

---

### 2. Price History

**API:** Private Zillow  
**Host:** `private-zillow.p.rapidapi.com`  
**Endpoint:** `/pricehistory`  
**Method:** GET

#### Raw API Call (JavaScript)

```javascript
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;

xhr.addEventListener('readystatechange', function () {
  if (this.readyState === this.DONE) {
    console.log(this.responseText);
  }
});

xhr.open('GET', 'https://private-zillow.p.rapidapi.com/pricehistory?byzpid=44466838&byaddress=3%20W%20Forest%20Dr%2C%20Rochester%2C%20NY%2014624');
xhr.setRequestHeader('x-rapidapi-key', 'YOUR_API_KEY');
xhr.setRequestHeader('x-rapidapi-host', 'private-zillow.p.rapidapi.com');

xhr.send(null);
```

#### Next.js API Route

```typescript
// src/app/api/property/history/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')
  const zpid = searchParams.get('zpid')

  if (!address && !zpid) {
    return NextResponse.json({ error: 'address or zpid parameter is required' }, { status: 400 })
  }

  try {
    let url = `https://${process.env.RAPIDAPI_HOST}/pricehistory?`
    
    if (zpid) {
      url += `byzpid=${zpid}`
    }
    if (address) {
      url += `${zpid ? '&' : ''}byaddress=${encodeURIComponent(address)}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
        'x-rapidapi-host': process.env.RAPIDAPI_HOST || '',
      },
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching price history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}
```

#### Response Structure

```json
{
  "priceHistory": [
    {
      "date": "2024-01-15",
      "price": 450000,
      "event": "Sold"
    },
    {
      "date": "2023-11-01",
      "price": 475000,
      "event": "Listed for sale"
    }
  ]
}
```

---

### 3. Zestimate History (Graph Data)

**API:** Private Zillow  
**Host:** `private-zillow.p.rapidapi.com`  
**Endpoint:** `/graph_charts`  
**Method:** GET

#### Raw API Call (JavaScript)

```javascript
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;

xhr.addEventListener('readystatechange', function () {
  if (this.readyState === this.DONE) {
    console.log(this.responseText);
  }
});

xhr.open('GET', 'https://private-zillow.p.rapidapi.com/graph_charts?recent_first=True&which=zestimate_history&byzpid=30907787&byaddress=3%20W%20Forest%20Dr%2C%20Rochester%2C%20NY%2014624');
xhr.setRequestHeader('x-rapidapi-key', 'YOUR_API_KEY');
xhr.setRequestHeader('x-rapidapi-host', 'private-zillow.p.rapidapi.com');

xhr.send(null);
```

#### Next.js API Route

```typescript
// src/app/api/property/zestimate/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')
  const zpid = searchParams.get('zpid')

  if (!address && !zpid) {
    return NextResponse.json({ error: 'address or zpid parameter is required' }, { status: 400 })
  }

  try {
    let url = `https://${process.env.RAPIDAPI_HOST}/graph_charts?recent_first=True&which=zestimate_history`
    
    if (zpid) {
      url += `&byzpid=${zpid}`
    }
    if (address) {
      url += `&byaddress=${encodeURIComponent(address)}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
        'x-rapidapi-host': process.env.RAPIDAPI_HOST || '',
      },
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching zestimate history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch zestimate history' },
      { status: 500 }
    )
  }
}
```

#### Response Structure

```json
{
  "message": "200: Success",
  "GraphType": "zestimate_history",
  "DataPoints": {
    "city": "Rochester",
    "state": "NY",
    "streetAddress": "3 W Forest Dr",
    "zipcode": "14624",
    "homeValueChartData": [
      {
        "points": [
          { "x": 1766217600000, "y": 234400 },
          { "x": 1764489600000, "y": 232100 }
        ],
        "name": "This home"
      }
    ]
  }
}
```

**Note:** The `x` value is a Unix timestamp in milliseconds. Convert to date:
```javascript
new Date(1766217600000).toLocaleDateString() // "12/20/2025"
```

---

## Frontend Usage Examples

### Fetch Property Details

```typescript
const searchProperty = async (address: string) => {
  const response = await fetch(`/api/property/address?address=${encodeURIComponent(address)}`)
  const data = await response.json()
  
  if (response.ok) {
    console.log('Property:', data.propertyDetails)
  }
}
```

### Fetch All Data in Parallel

```typescript
const fetchAllPropertyData = async (address: string) => {
  // First get property details to get zpid
  const propertyResponse = await fetch(`/api/property/address?address=${encodeURIComponent(address)}`)
  const propertyData = await propertyResponse.json()
  
  const zpid = propertyData.propertyDetails?.zpid
  const params = zpid 
    ? `zpid=${zpid}&address=${encodeURIComponent(address)}`
    : `address=${encodeURIComponent(address)}`
  
  // Fetch history and zestimate in parallel
  const [historyResponse, zestimateResponse] = await Promise.all([
    fetch(`/api/property/history?${params}`),
    fetch(`/api/property/zestimate?${params}`)
  ])

  const historyData = await historyResponse.json()
  const zestimateData = await zestimateResponse.json()

  return {
    property: propertyData,
    priceHistory: historyData,
    zestimateHistory: zestimateData
  }
}
```

### Display Zestimate Chart with Recharts

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Transform API data for chart
const chartData = zestimateHistory.DataPoints.homeValueChartData[0].points
  .sort((a, b) => a.x - b.x)  // Sort by date ascending
  .map(item => ({
    date: new Date(item.x).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    value: item.y,
    fullDate: new Date(item.x).toLocaleDateString()
  }))

// Render chart
<ResponsiveContainer width="100%" height={256}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Zestimate']} />
    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^2.10.3",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "tailwindcss": "^3.3.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8"
  }
}
```

---

## Security Notes

1. **Never expose your API key** in client-side code
2. Always use **environment variables** for API keys
3. Create **server-side API routes** to proxy requests
4. Add `.env.local` to `.gitignore`

---

## Rate Limits

Check your RapidAPI subscription for rate limits. The Private Zillow API may have:
- Requests per second limit
- Monthly request quota

Consider implementing:
- Request caching
- Rate limiting on your API routes
- Error handling for 429 (Too Many Requests) responses
