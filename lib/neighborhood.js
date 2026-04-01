import { supabase } from './supabase'

const RADIUS_MILES = 0.75

function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function assignNeighborhood(lat, lng) {
  const { data: neighborhoods } = await supabase
    .from('neighborhoods')
    .select('*')

  if (neighborhoods) {
    for (const n of neighborhoods) {
      if (distanceMiles(lat, lng, n.center_lat, n.center_lng) <= RADIUS_MILES) {
        return n
      }
    }
  }

  const name = await getNeighborhoodName(lat, lng)

  const { data: newNeighborhood, error: nhError } = await supabase
    .from('neighborhoods')
    .insert({ name, center_lat: lat, center_lng: lng, radius_miles: RADIUS_MILES })
    .select()
    .single()

  if (nhError || !newNeighborhood) {
    console.error('Failed to create neighborhood:', nhError)
    return null
  }

  await supabase.from('rooms').insert({
    neighborhood_id: newNeighborhood.id,
    name: `${name} General`,
    is_main: true,
    is_private: false
  })

  return newNeighborhood
}

export async function detectCurrentNeighborhood() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const hood = await assignNeighborhood(lat, lng)
        resolve({ hood, lat, lng })
      },
      () => resolve({ hood: null, lat: null, lng: null })
    )
  })
}

async function getNeighborhoodName(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    )
    const data = await res.json()
    return (
      data.address?.neighbourhood ||
      data.address?.suburb ||
      data.address?.quarter ||
      data.address?.village ||
      data.address?.town ||
      data.address?.city ||
      'Your Neighborhood'
    )
  } catch {
    return 'Your Neighborhood'
  }
}

const adjectives = ['Quiet', 'Breezy', 'Golden', 'Misty', 'Sunny', 'Mellow', 'Crisp', 'Amber']
const nouns = ['Porch', 'Elm', 'Sparrow', 'Maple', 'Creek', 'Hollow', 'Finch', 'Lantern']

export function generateUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${adj}${noun}${num}`
}
