import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
} from "react-native";

import MapView, {
  Marker,
  Callout,
  Region,
} from "react-native-maps";
import Geolocation from "@react-native-community/geolocation";


const OPENCHARGE_API_KEY =
  "ca6f75ef-fcdd-4057-a1bf-1a32c7156d20";

interface Location {
  latitude: number;
  longitude: number;
}

export default function App() {
  const mapRef = useRef<MapView>(null);

  const [currentLocation, setCurrentLocation] =
    useState<Location | null>(null);

  const [stations, setStations] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [predictedRange, setPredictedRange] =
    useState("480");

  const [soc, setSoc] = useState("80");

  const [selectedStation, setSelectedStation] =
    useState<any>(null);

  const remainingRange =
    (Number(predictedRange) * Number(soc)) / 100;

  // --------------------------------------------------
  // GET LOCATION PERMISSION
  // --------------------------------------------------

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message:
              "MyMapApp needs your location to find nearby EV charging stations.",
            buttonPositive: "Allow",
            buttonNegative: "Cancel",
          }
        );

        if (
          granted !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          Alert.alert(
            "Location Permission Denied",
            "Please allow location permission to find nearby charging stations."
          );

          setLoading(false);
          return;
        }
      }

      // Permission granted
      getCurrentLocation();
    } catch (error) {
      console.log(
        "Location permission error:",
        error
      );

      setLoading(false);
    }
  };

  // --------------------------------------------------
  // GET CURRENT LOCATION
  // --------------------------------------------------

  const getCurrentLocation = () => {
  Geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      console.log(
        "CURRENT LOCATION:",
        latitude,
        longitude
      );

      const location = {
        latitude,
        longitude,
      };

      setCurrentLocation(location);

      // Move map to user's location
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );

      // Find nearby charging stations
      fetchStations(latitude, longitude);

      setLoading(false);
    },

    (error) => {
      console.log(
        "Location error:",
        error.code,
        error.message
      );

      setLoading(false);

      Alert.alert(
        "Location Error",
        `Could not get your location.\n\n${error.message}`
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    }
  );
};


  // --------------------------------------------------
  // FETCH EV CHARGING STATIONS
  // --------------------------------------------------

  const fetchStations = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      console.log(
        "Searching charging stations near:",
        latitude,
        longitude
      );

      const url =
        `https://api.openchargemap.io/v3/poi/` +
        `?output=json` +
        `&latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&distance=50` +
        `&distanceunit=KM` +
        `&maxresults=50` +
        `&key=${OPENCHARGE_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        "Charging stations:",
        data.length
      );

      setStations(data);
    } catch (error) {
      console.log(
        "Charging station error:",
        error
      );

      Alert.alert(
        "Charging Station Error",
        "Unable to load nearby charging stations."
      );
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#1976D2"
        />

        <Text style={styles.loadingText}>
          Getting your location...
        </Text>
      </View>
    );
  }

  // --------------------------------------------------
  // LOCATION FAILED
  // --------------------------------------------------

  if (!currentLocation) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>
          Could not get your location.
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            getCurrentLocation();
          }}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --------------------------------------------------
  // MAIN APP
  // --------------------------------------------------

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>
          EV Charging Station Finder
        </Text>
      </View>

      {/* RANGE CARD */}
      <View style={styles.card}>

        <Text style={styles.label}>
          Predicted Full Range (km)
        </Text>

        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={predictedRange}
          onChangeText={setPredictedRange}
        />

        <Text style={styles.label}>
          Battery SoC (%)
        </Text>

        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={soc}
          onChangeText={setSoc}
        />

        <Text style={styles.range}>
          Remaining Range:{" "}
          {remainingRange.toFixed(2)} km
        </Text>

      </View>

      {/* MAP */}
      <MapView
        ref={mapRef}
        style={styles.map}

        provider="google"

        initialRegion={{
          latitude:
            currentLocation.latitude,

          longitude:
            currentLocation.longitude,

          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}

        showsUserLocation={true}
        showsMyLocationButton={true}

        userLocationPriority="high"
        userLocationUpdateInterval={5000}
        userLocationFastestInterval={3000}

        onUserLocationChange={(event) => {
          const coordinate =
            event.nativeEvent.coordinate;

          if (!coordinate) return;

          const location = {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          };

          setCurrentLocation(location);
        }}
      >

        {/* USER MARKER */}

        <Marker
          coordinate={currentLocation}
          title="You are here"
          description="Your current location"
          pinColor="blue"
        />

        {/* CHARGING STATIONS */}

        {stations.map((station) => {

          const address =
            station.AddressInfo;

          if (
            !address ||
            address.Latitude == null ||
            address.Longitude == null
          ) {
            return null;
          }

          return (
            <Marker
              key={String(station.ID)}

              coordinate={{
                latitude:
                  address.Latitude,

                longitude:
                  address.Longitude,
              }}

              pinColor="green"

              onPress={() => {
                setSelectedStation(station);
              }}
            >
              <Callout
                onPress={() => {
                  setSelectedStation(station);
                }}
              >
                <View
                  style={
                    styles.callout
                  }
                >

                  <Text
                    style={
                      styles.stationTitle
                    }
                  >
                    {address.Title ||
                      "EV Charging Station"}
                  </Text>

                  <Text>
                    {address.AddressLine1 ||
                      "Address unavailable"}
                  </Text>

                  <Text>
                    Chargers:{" "}
                    {station.NumberOfPoints ||
                      "Unknown"}
                  </Text>

                </View>
              </Callout>
            </Marker>
          );
        })}

      </MapView>

      {/* LOCATION BUTTON */}

      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={() => {
          mapRef.current?.animateToRegion(
            {
              latitude:
                currentLocation.latitude,

              longitude:
                currentLocation.longitude,

              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            },
            800
          );

          fetchStations(
            currentLocation.latitude,
            currentLocation.longitude
          );
        }}
      >
        <Text
          style={styles.myLocationText}
        >
          📍 My Location
        </Text>
      </TouchableOpacity>

      {/* STATION COUNT */}

      <View style={styles.stationCount}>
        <Text
          style={styles.stationCountText}
        >
          ⚡ {stations.length} charging stations
        </Text>
      </View>

    </View>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#555",
  },

  errorText: {
    fontSize: 17,
    color: "#d32f2f",
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: "#1976D2",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },

  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  header: {
    paddingTop: 45,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 21,
    fontWeight: "bold",
    textAlign: "center",
    color: "#222",
  },

  card: {
    paddingHorizontal: 15,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },

  label: {
    fontSize: 14,
    color: "#444",
    marginTop: 3,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    fontSize: 16,
  },

  range: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
    color: "#2e7d32",
  },

  map: {
    flex: 1,
  },

  callout: {
    width: 220,
    padding: 5,
  },

  stationTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 5,
  },

  myLocationButton: {
    position: "absolute",
    right: 15,
    bottom: 30,
    backgroundColor: "#1976D2",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
  },

  myLocationText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },

  stationCount: {
    position: "absolute",
    left: 15,
    bottom: 30,
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 5,
  },

  stationCountText: {
    fontWeight: "bold",
    color: "#333",
  },

});
