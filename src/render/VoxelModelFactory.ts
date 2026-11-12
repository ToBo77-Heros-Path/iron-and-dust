import * as THREE from 'three';
import { BuildingId } from '../data/buildings';
import { FactionId, FACTIONS } from '../data/factions';
import { UnitId } from '../data/units';

export interface Entity3DObject {
  root: THREE.Group;
  turret?: THREE.Object3D;
  animPart?: THREE.Object3D;
  selectionRing?: THREE.Mesh;
  hpBarBg?: THREE.Mesh;
  hpBarFill?: THREE.Mesh;
}

export class VoxelModelFactory {
  private static darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x262b33,
    roughness: 0.55,
    metalness: 0.65
  });

  private static lightSteelMat = new THREE.MeshStandardMaterial({
    color: 0x868e96,
    roughness: 0.45,
    metalness: 0.55
  });

  private static treadMat = new THREE.MeshStandardMaterial({
    color: 0x16191d,
    roughness: 0.85,
    metalness: 0.2
  });

  public static createBuildingMesh(
    buildingId: BuildingId,
    faction: FactionId,
    w: number,
    h: number
  ): Entity3DObject {
    const fDef = FACTIONS[faction];
    const root = new THREE.Group();

    const primaryMat = new THREE.MeshStandardMaterial({
      color: fDef.accentHex,
      roughness: 0.45,
      metalness: 0.35
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x3b424c,
      roughness: 0.65,
      metalness: 0.3
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: fDef.emissiveHex,
      emissive: fDef.emissiveHex,
      emissiveIntensity: 1.4,
      roughness: 0.2
    });

    // Plinth / Foundation base
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, 0.16, h * 0.92),
      this.darkMetalMat
    );
    plinth.position.y = 0.08;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    root.add(plinth);

    let turret: THREE.Object3D | undefined;
    let animPart: THREE.Object3D | undefined;

    switch (buildingId) {
      case 'construction_yard': {
        const hall = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 1.8), baseMat);
        hall.position.set(0, 0.5, -0.2);
        hall.castShadow = true;
        root.add(hall);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 1.5), primaryMat);
        roof.position.set(0, 1.02, -0.2);
        root.add(roof);

        // Crane tower & jib
        const craneGroup = new THREE.Group();
        craneGroup.position.set(0.65, 0.16, 0.65);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.65, 0.32), primaryMat);
        tower.position.y = 0.82;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.2), this.lightSteelMat);
        arm.position.set(-0.45, 1.55, 0);
        craneGroup.add(tower, arm);
        root.add(craneGroup);
        animPart = craneGroup;
        break;
      }

      case 'power_plant':
      case 'adv_power_plant': {
        const isAdv = buildingId === 'adv_power_plant';
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1.65, isAdv ? 0.95 : 0.7, 1.65),
          baseMat
        );
        body.position.y = isAdv ? 0.55 : 0.42;
        body.castShadow = true;
        root.add(body);

        // Cooling / Wind-trap turbine domes
        const turbineGroup = new THREE.Group();
        turbineGroup.position.set(0, isAdv ? 1.15 : 0.88, 0);
        const core = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, 0.56, 0.55, 8),
          primaryMat
        );
        const glowRing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.52, 0.52, 0.16, 8),
          glowMat
        );
        glowRing.position.y = 0.15;
        turbineGroup.add(core, glowRing);
        if (isAdv) {
          const secondCore = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.38, 0),
            glowMat
          );
          secondCore.position.y = 0.55;
          turbineGroup.add(secondCore);
        }
        root.add(turbineGroup);
        animPart = turbineGroup;
        break;
      }

      case 'refinery': {
        const mainPlant = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 1.6), baseMat);
        mainPlant.position.set(0, 0.52, -0.45);
        mainPlant.castShadow = true;
        root.add(mainPlant);

        // Twin Silo vats on top
        for (const sx of [-0.65, 0.65]) {
          const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.35, 10), primaryMat);
          vat.position.set(sx, 0.82, -0.45);
          vat.castShadow = true;
          root.add(vat);
        }

        // Docking bay ramp at bottom (+Z)
        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.12, 1.1),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 })
        );
        pad.position.set(0, 0.18, 0.72);
        root.add(pad);
        break;
      }

      case 'silo': {
        for (const [sx, sz] of [
          [-0.42, -0.42],
          [0.42, -0.42],
          [-0.42, 0.42],
          [0.42, 0.42]
        ]) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.95, 8), primaryMat);
          tank.position.set(sx, 0.55, sz);
          tank.castShadow = true;
          root.add(tank);
        }
        break;
      }

      case 'barracks': {
        const bunker = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.75, 1.55), baseMat);
        bunker.position.y = 0.45;
        bunker.castShadow = true;
        root.add(bunker);

        const roofArch = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.2), primaryMat);
        roofArch.position.y = 0.92;
        root.add(roofArch);

        const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.22), glowMat);
        beacon.position.set(0.55, 1.15, -0.45);
        root.add(beacon);
        break;
      }

      case 'sandbag_wall': {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 0.92), baseMat);
        wall.position.y = 0.32;
        wall.castShadow = true;
        root.add(wall);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.12, 0.94), primaryMat);
        stripe.position.y = 0.52;
        root.add(stripe);
        break;
      }

      case 'pillbox': {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.45, 6), baseMat);
        base.position.y = 0.3;
        root.add(base);

        const tGroup = new THREE.Group();
        tGroup.position.y = 0.58;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), primaryMat);
        const barrel1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.08), this.lightSteelMat);
        barrel1.position.set(0.32, 0, -0.1);
        const barrel2 = barrel1.clone();
        barrel2.position.set(0.32, 0, 0.1);
        tGroup.add(head, barrel1, barrel2);
        root.add(tGroup);
        turret = tGroup;
        break;
      }

      case 'war_factory': {
        const hangar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 2.2), baseMat);
        hangar.position.set(0, 0.62, -0.15);
        hangar.castShadow = true;
        root.add(hangar);

        const sawRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 1.8), primaryMat);
        sawRoof.position.set(0, 1.3, -0.15);
        root.add(sawRoof);

        const smokestack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 1.75, 8),
          this.darkMetalMat
        );
        smokestack.position.set(-0.95, 0.95, -0.75);
        root.add(smokestack);
        break;
      }

      case 'repair_pad': {
        const ring = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 1.75), primaryMat);
        ring.position.y = 0.18;
        root.add(ring);

        const gantry = new THREE.Group();
        gantry.position.set(0, 0.24, -0.65);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 0.3), this.lightSteelMat);
        arm.position.y = 0.32;
        gantry.add(arm);
        root.add(gantry);
        break;
      }

      case 'radar_outpost': {
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.6), baseMat);
        bldg.position.y = 0.48;
        bldg.castShadow = true;
        root.add(bldg);

        const dishGroup = new THREE.Group();
        dishGroup.position.set(0, 1.12, 0);
        const dish = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 0.18), primaryMat);
        dish.rotation.x = -0.35;
        const feed = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), glowMat);
        feed.position.z = 0.25;
        dishGroup.add(dish, feed);
        root.add(dishGroup);
        animPart = dishGroup;
        break;
      }

      case 'tesla_coil': {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.55, 8), baseMat);
        ped.position.y = 0.35;
        root.add(ped);

        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.16, 1.35, 8),
          this.lightSteelMat
        );
        pole.position.y = 0.95;
        root.add(pole);

        for (const ry of [0.85, 1.15, 1.42]) {
          const coilRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10),
            this.lightSteelMat
          );
          coilRing.position.y = ry;
          root.add(coilRing);
        }

        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 10, 10),
          new THREE.MeshStandardMaterial({
            color: 0x74c0fc,
            emissive: 0x4dabf7,
            emissiveIntensity: 2.0
          })
        );
        orb.position.y = 1.72;
        root.add(orb);
        animPart = orb;
        break;
      }

      case 'flame_tower':
      case 'cryo_turret':
      case 'laser_turret': {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.65), baseMat);
        tower.position.y = 0.55;
        root.add(tower);

        const tGroup = new THREE.Group();
        tGroup.position.y = 1.18;
        const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), glowMat);
        const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.16), primaryMat);
        emitter.position.x = 0.25;
        tGroup.add(head, emitter);
        root.add(tGroup);
        turret = tGroup;
        break;
      }

      case 'tech_center': {
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.85, 1.75), baseMat);
        base.position.y = 0.5;
        base.castShadow = true;
        root.add(base);

        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 10), primaryMat);
        dome.position.y = 1.05;
        root.add(dome);

        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.1, 6), glowMat);
        spire.position.y = 1.65;
        root.add(spire);
        break;
      }

      case 'palace_superweapon': {
        const citadel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.15, 2.6), baseMat);
        citadel.position.y = 0.65;
        citadel.castShadow = true;
        root.add(citadel);

        const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 1.85, 10), primaryMat);
        silo.position.y = 1.25;
        root.add(silo);

        const warheadCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), glowMat);
        warheadCore.position.y = 2.35;
        root.add(warheadCore);
        animPart = warheadCore;
        break;
      }
    }

    const { hpBarBg, hpBarFill } = this.createHealthBar(w * 0.85, 2.5);
    root.add(hpBarBg, hpBarFill);

    return { root, turret, animPart, hpBarBg, hpBarFill };
  }

  public static createUnitMesh(unitId: UnitId, faction: FactionId): Entity3DObject {
    const fDef = FACTIONS[faction];
    const root = new THREE.Group();

    const primaryMat = new THREE.MeshStandardMaterial({
      color: fDef.accentHex,
      roughness: 0.4,
      metalness: 0.4
    });
    const hullMat = new THREE.MeshStandardMaterial({
      color: fDef.darkHex,
      roughness: 0.55,
      metalness: 0.35
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: fDef.emissiveHex,
      emissive: fDef.emissiveHex,
      emissiveIntensity: 1.5
    });

    // Selection Ring
    const ringGeo = new THREE.RingGeometry(0.36, 0.44, 20);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x51cf66,
      side: THREE.DoubleSide
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.position.y = 0.04;
    selectionRing.visible = false;
    root.add(selectionRing);

    let turret: THREE.Object3D | undefined;

    if (
      unitId === 'light_infantry' ||
      unitId === 'rocket_trooper' ||
      unitId === 'flamer_squad' ||
      unitId === 'engineer' ||
      unitId === 'commando'
    ) {
      // Multi-soldier squad (or tall commando/engineer)
      const offsets =
        unitId === 'commando' || unitId === 'engineer'
          ? [[0, 0]]
          : [
              [-0.14, -0.12],
              [0.14, -0.12],
              [0, 0.14]
            ];

      const tGroup = new THREE.Group();
      for (const [ox, oz] of offsets) {
        const torso = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, unitId === 'commando' ? 0.32 : 0.24, 0.15),
          primaryMat
        );
        torso.position.set(ox, 0.2, oz);
        torso.castShadow = true;

        const helm = new THREE.Mesh(
          new THREE.BoxGeometry(0.13, 0.12, 0.13),
          unitId === 'commando' ? glowMat : this.lightSteelMat
        );
        helm.position.set(ox, unitId === 'commando' ? 0.42 : 0.36, oz);

        const gun = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.06, 0.06),
          unitId === 'rocket_trooper' ? primaryMat : this.darkMetalMat
        );
        gun.position.set(ox + 0.12, 0.24, oz);

        tGroup.add(torso, helm, gun);
      }
      root.add(tGroup);
      turret = tGroup;
    } else if (unitId === 'harvester') {
      // Heavy Armored Ore Harvester with front scoop and glowing ore hopper
      const treadsL = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.2, 0.18), this.treadMat);
      treadsL.position.set(0, 0.1, -0.26);
      const treadsR = treadsL.clone();
      treadsR.position.set(0, 0.1, 0.26);

      const bin = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.56), primaryMat);
      bin.position.set(-0.1, 0.28, 0);
      bin.castShadow = true;

      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.46), glowMat);
      cab.position.set(0.28, 0.26, 0);

      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.62), this.lightSteelMat);
      scoop.position.set(0.46, 0.12, 0);

      root.add(treadsL, treadsR, bin, cab, scoop);
    } else if (unitId === 'scout_trike') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.34), primaryMat);
      body.position.y = 0.18;
      body.castShadow = true;
      root.add(body);

      const tGroup = new THREE.Group();
      tGroup.position.y = 0.32;
      const mg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), this.lightSteelMat);
      mg.position.x = 0.12;
      tGroup.add(mg);
      root.add(tGroup);
      turret = tGroup;
    } else if (unitId === 'mcv') {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.72), primaryMat);
      hull.position.y = 0.24;
      hull.castShadow = true;
      const dome = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.5), glowMat);
      dome.position.set(0.15, 0.52, 0);
      root.add(hull, dome);
    } else {
      // Battle Tanks, Mammoth Devastator, Sonic Tank, V2, Deviator, Stealth Tank
      const isMammoth = unitId === 'mammoth_devastator';
      const isDoubleBarrel = isMammoth || unitId === 'heavy_siege_tank';
      const scale = isMammoth ? 1.18 : 1.0;

      const treadsL = new THREE.Mesh(
        new THREE.BoxGeometry(0.76 * scale, 0.2 * scale, 0.16 * scale),
        this.treadMat
      );
      treadsL.position.set(0, 0.1 * scale, -0.24 * scale);
      const treadsR = treadsL.clone();
      treadsR.position.set(0, 0.1 * scale, 0.24 * scale);

      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.68 * scale, 0.22 * scale, 0.44 * scale),
        hullMat
      );
      chassis.position.y = 0.2 * scale;
      chassis.castShadow = true;

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(0.7 * scale, 0.08 * scale, 0.46 * scale),
        primaryMat
      );
      trim.position.y = 0.28 * scale;

      root.add(treadsL, treadsR, chassis, trim);

      const tGroup = new THREE.Group();
      tGroup.position.y = 0.36 * scale;

      if (unitId === 'sonic_artillery') {
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.28, 8), glowMat);
        dish.rotation.z = Math.PI / 2;
        dish.position.x = 0.1;
        tGroup.add(dish);
      } else if (unitId === 'v2_launcher' || unitId === 'deviator_tank') {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.32), primaryMat);
        rack.rotation.z = 0.35;
        rack.position.y = 0.08;
        tGroup.add(rack);
      } else {
        const turretBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.38 * scale, 0.18 * scale, 0.34 * scale),
          primaryMat
        );
        tGroup.add(turretBox);

        if (isDoubleBarrel) {
          const b1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.52 * scale, 0.07 * scale, 0.07 * scale),
            this.lightSteelMat
          );
          b1.position.set(0.32 * scale, 0, -0.08 * scale);
          const b2 = b1.clone();
          b2.position.set(0.32 * scale, 0, 0.08 * scale);
          tGroup.add(b1, b2);
        } else {
          const b1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.48 * scale, 0.07 * scale, 0.07 * scale),
            this.lightSteelMat
          );
          b1.position.set(0.3 * scale, 0, 0);
          tGroup.add(b1);
        }
      }

      root.add(tGroup);
      turret = tGroup;
    }

    const { hpBarBg, hpBarFill } = this.createHealthBar(0.68, 0.82);
    root.add(hpBarBg, hpBarFill);

    return { root, turret, selectionRing, hpBarBg, hpBarFill };
  }

  private static createHealthBar(width: number, yOffset: number): {
    hpBarBg: THREE.Mesh;
    hpBarFill: THREE.Mesh;
  } {
    const bgGeo = new THREE.PlaneGeometry(width, 0.1);
    bgGeo.rotateX(-Math.PI / 4);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const hpBarBg = new THREE.Mesh(bgGeo, bgMat);
    hpBarBg.position.set(0, yOffset, 0);

    const fillGeo = new THREE.PlaneGeometry(width - 0.04, 0.07);
    fillGeo.rotateX(-Math.PI / 4);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x40c057, side: THREE.DoubleSide });
    const hpBarFill = new THREE.Mesh(fillGeo, fillMat);
    hpBarFill.position.set(0, yOffset + 0.01, 0.01);

    return { hpBarBg, hpBarFill };
  }
}
