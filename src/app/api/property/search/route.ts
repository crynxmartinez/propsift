import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address parameter is required' }, { status: 400 })
  }

  try {
    // Check if property exists in database
    const existingProperty = await prisma.property.findUnique({
      where: { address },
    })

    // If exists and less than 7 days old, return cached data
    if (existingProperty) {
      const daysSinceUpdate = (Date.now() - existingProperty.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceUpdate < 7) {
        return NextResponse.json({
          cached: true,
          propertyDetails: {
            zpid: existingProperty.zpid,
            streetAddress: existingProperty.streetAddress,
            city: existingProperty.city,
            state: existingProperty.state,
            zipcode: existingProperty.zipcode,
            bedrooms: existingProperty.bedrooms,
            bathrooms: existingProperty.bathrooms,
            livingArea: existingProperty.livingArea,
            yearBuilt: existingProperty.yearBuilt,
            homeType: existingProperty.homeType,
            price: existingProperty.price,
            zestimate: existingProperty.zestimate,
          },
        })
      }
    }

    // Fetch from API
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
    const details = data.propertyDetails

    if (details) {
      // Save to database
      await prisma.property.upsert({
        where: { address },
        update: {
          zpid: details.zpid?.toString(),
          streetAddress: details.streetAddress,
          city: details.city,
          state: details.state,
          zipcode: details.zipcode,
          bedrooms: details.bedrooms,
          bathrooms: details.bathrooms,
          livingArea: details.livingArea,
          yearBuilt: details.yearBuilt,
          homeType: details.homeType,
          price: details.price,
          zestimate: details.zestimate,
          rawData: data,
        },
        create: {
          address,
          zpid: details.zpid?.toString(),
          streetAddress: details.streetAddress,
          city: details.city,
          state: details.state,
          zipcode: details.zipcode,
          bedrooms: details.bedrooms,
          bathrooms: details.bathrooms,
          livingArea: details.livingArea,
          yearBuilt: details.yearBuilt,
          homeType: details.homeType,
          price: details.price,
          zestimate: details.zestimate,
          rawData: data,
        },
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property data' },
      { status: 500 }
    )
  }
}
