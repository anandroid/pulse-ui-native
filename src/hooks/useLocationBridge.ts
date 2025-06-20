import { useEffect, useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LOCATION_STORAGE_KEY = 'pulse-location-data';
const LOCATION_PERMISSION_KEY = 'pulse-location-permission-asked';

export interface LocationData {
  area: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface UseLocationBridgeReturn {
  locationData: LocationData | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  hasLocationPermission: boolean;
  sendLocationToWebView: (webViewRef: any) => void;
}

export function useLocationBridge(): UseLocationBridgeReturn {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const hasRequestedPermission = useRef(false);

  // Load saved location on mount
  useEffect(() => {
    loadSavedLocation();
    checkLocationPermission();
  }, []);

  const loadSavedLocation = async () => {
    try {
      const savedLocation = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (savedLocation) {
        setLocationData(JSON.parse(savedLocation));
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocation = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Check if we've already asked for permission
      const hasAskedBefore = await AsyncStorage.getItem(LOCATION_PERMISSION_KEY);
      
      // Request permission if not already granted
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted' && !hasAskedBefore && !hasRequestedPermission.current) {
        hasRequestedPermission.current = true;
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'true');
      }
      
      if (finalStatus !== 'granted') {
        setError('Location permission not granted');
        setHasLocationPermission(false);
        return;
      }
      
      setHasLocationPermission(true);

      // Get current location with coarse accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        
        // Determine area name - prioritize district, then city, then subregion
        let area = address.district || address.city || address.subregion || 'Unknown Area';
        
        // For some locations, district might be too specific, so we might want to use city
        if (address.city && address.district && address.district !== address.city) {
          // If district is very specific (like a neighborhood), use city instead
          area = address.city;
        }

        const locationData: LocationData = {
          area: area,
          city: address.city || 'Unknown City',
          state: address.region || address.subregion || 'Unknown State',
          country: address.country || 'Unknown Country',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
        };

        setLocationData(locationData);
        
        // Save to storage
        await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
        
        console.log('Location data:', locationData);
      } else {
        setError('Could not determine location details');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setError(error instanceof Error ? error.message : 'Failed to get location');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const sendLocationToWebView = useCallback((webViewRef: any) => {
    if (locationData && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'location-data',
        data: locationData,
      }));
    }
  }, [locationData]);

  return {
    locationData,
    isLoading,
    error,
    requestLocation,
    hasLocationPermission,
    sendLocationToWebView,
  };
}