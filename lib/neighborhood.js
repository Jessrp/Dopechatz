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

  if (neighborhoods && neighborhoods.length > 0) {
    // Find ALL neighborhoods within radius, then pick the CLOSEST one
    const nearby = neighborhoods
      .map(n => ({
        ...n,
        distance: distanceMiles(lat, lng, n.center_lat, n.center_lng)
      }))
      .filter(n => n.distance <= RADIUS_MILES)
      .sort((a, b) => a.distance - b.distance)

    if (nearby.length > 0) return nearby[0]
  }

  // No existing neighborhood found — create a new one
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

  const { data: newRoom } = await supabase.from('rooms').insert({
    neighborhood_id: newNeighborhood.id,
    name: `${name} General`,
    is_main: true,
    is_private: false
  }).select().single()

  // Seed welcome message from Dopechatz system user
  if (newRoom) {
    await supabase.from('messages').insert({
      room_id: newRoom.id,
      user_id: '00000000-0000-0000-0000-000000000099',
      content: `👋 Welcome to Dopechatz!\n\nThis is your neighborhood's anonymous chat — say whatever you want your block to hear. No real names, no drama, just your community talking.\n\nBeyond this main room, there are chatrooms for dating, local services, buying & selling, car talk, music, events, and more — all free to browse.\n\nWe're in early development, so if you spot any issues or have feedback, hit us at dopechatz@gmail.com — and please share this app with anyone you think would use it. Help us get the ball rolling!\n\n— The Dopechatz Team 🏘️`,
      created_at: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

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
      () => resolve({ hood: null, lat: null, lng: null }),
      { maximumAge: 0, timeout: 10000, enableHighAccuracy: true }
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
