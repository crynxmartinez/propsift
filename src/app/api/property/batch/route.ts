import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'File is empty or has no data rows' }, { status: 400 })
    }

    // Parse CSV header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
    const addressIndex = header.findIndex(h => h === 'address')

    if (addressIndex === -1) {
      return NextResponse.json({ error: 'No "address" column found in file' }, { status: 400 })
    }

    // Parse addresses
    const addresses: string[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values[addressIndex]) {
        addresses.push(values[addressIndex])
      }
    }

    let processed = 0
    const errors: string[] = []

    // Process each address
    for (const address of addresses) {
      try {
        // Check if already in database
        const existing = await prisma.property.findUnique({
          where: { address },
        })

        if (existing) {
          const daysSinceUpdate = (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceUpdate < 7) {
            processed++
            continue // Skip, data is fresh
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

        if (response.ok) {
          const data = await response.json()
          const details = data.propertyDetails

          if (details) {
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
            processed++
          }
        }

        // Rate limiting - wait 500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        errors.push(`Failed to process: ${address}`)
      }
    }

    return NextResponse.json({
      count: processed,
      total: addresses.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Batch upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch upload' },
      { status: 500 }
    )
  }
}
