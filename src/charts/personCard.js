import {personAge} from '../personAge.js'
import {mdiAccount, mdiFaceMan, mdiFaceWoman} from '@mdi/js'
import {updatePhotoButtons} from './photoButton.js'
import {local, select} from 'd3-selection'
import {getPersonNameDisplay} from '../components/nameHistory.js'
import {chartNameDisplayFormat, fireEvent} from '../util.js'
import {
  appendAddPersonButton,
  colorAddPersonButtons,
} from './addPersonButton.js'
import {chartPalette} from './palette.js'
import {SYMBOL_SETS, SYMBOL_SET_DEFAULT} from '../symbols.js'

// Pattern ids must be unique in the document, and the same person can be
// shown in several cards
let imagePatternCount = 0

// Shortens `s` to fit `length` pixels, estimating the character width
function clipString(s, length, fontSize = 13) {
  if (!s) {
    return ''
  }
  const nChar = length / (fontSize * 0.6)
  if (s.length <= nChar) {
    return s
  }
  if (nChar < 2) {
    return ''
  }
  return `${s.slice(0, nChar - 2)}…`
}

function isHoverDevice() {
  return !window.matchMedia('(hover: none)').matches
}

// Appends the visible part of a person card, centred on each node of the
// selection. `profile(d)` returns the person's profile, and `imageUrl(d)`
// returns the URL of their image or an empty string. Colours come from
// `palette`.
export function appendPersonCard(
  nodes,
  {
    profile,
    person = () => undefined,
    imageUrl = () => '',
    boxWidth = 190,
    boxHeight = 90,
    imgPadding = 10,
    nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
    birthSymbol = SYMBOL_SETS[SYMBOL_SET_DEFAULT].birthSymbol,
    deathSymbol = SYMBOL_SETS[SYMBOL_SET_DEFAULT].deathSymbol,
    palette = chartPalette,
    relationship = () => '',
    ageText = () => '',
  }
) {
  const left = -boxWidth / 2
  const top = -boxHeight / 2
  const imgRadius = Math.min(30, (boxHeight - imgPadding * 2) / 2)
  const textPadding = () => 2 * imgRadius + 2 * imgPadding

  nodes
    .append('rect')
    .attr('fill', d => palette.sex[profile(d)?.sex] ?? palette.sex.U)
    .attr('x', left - 4)
    .attr('y', top + 0.5)
    .attr('width', 24)
    .attr('height', boxHeight - 1)
    .attr('rx', 12)
    .attr('ry', 12)

  nodes
    .append('rect')
    .attr(
      'fill',
      d =>
        `color-mix(in srgb, ${
          palette.sex[profile(d)?.sex] ?? palette.sex.U
        } 22%, ${palette.personBox})`
    )
    .attr('x', left)
    .attr('y', top)
    .attr('width', boxWidth)
    .attr('height', boxHeight)
    .attr('rx', 8)
    .attr('ry', 8)

  const birthName = d =>
    getPersonNameDisplay(person(d) || {}, () => '').birth.replace(/^: /, '')
  nodes.append('title').text(d => {
    const main = getPersonNameDisplay(person(d) || {profile: profile(d)}).main
    return [
      birthName(d) ? `${main} (${birthName(d)})` : main,
      ageText(d),
      relationship(d),
    ]
      .filter(Boolean)
      .join(' · ')
  })

  const surnameFirst =
    nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
  const hasName = p => p?.name_given || p?.name_surname
  const lines = [
    {
      show: hasName,
      text: p =>
        surnameFirst ? `${p.name_surname || '…'},` : p.name_given || '…',
      weight: 500,
    },
    {
      show: hasName,
      text: p => (surnameFirst ? p.name_given || '…' : p.name_surname || '…'),
      weight: 500,
    },
    {
      show: p => p?.birth?.date,
      text: p => `${birthSymbol} ${p.birth.date}`,
      weight: 350,
    },
    {
      show: p => p?.death?.date,
      text: p => `${deathSymbol} ${p.death.date}`,
      weight: 350,
    },
  ]
  lines.forEach((line, i) => {
    nodes
      .filter(d => line.show(profile(d)))
      .append('text')
      .attr('x', d => left + textPadding(d))
      .attr(
        'y',
        d => top + (birthName(d) ? 16 + 15 * (i > 1 ? i + 1 : i) : 25 + 17 * i)
      )
      .attr('text-anchor', 'start')
      .attr('font-weight', line.weight)
      .attr('fill', palette.text)
      .attr('paint-order', 'stroke')
      .text(d =>
        clipString(
          line.text(profile(d)),
          boxWidth - textPadding(d) - (i < 2 ? 44 : 10)
        )
      )
  })

  nodes
    .filter(d => birthName(d))
    .append('text')
    .attr('class', 'birth-name')
    .attr('x', d => left + textPadding(d))
    .attr('y', top + 46)
    .attr('font-size', 11)
    .attr('fill', palette.text)
    .text(d => clipString(`(${birthName(d)})`, boxWidth - textPadding(d)))

  for (const [className, text, y] of [
    ['person-age', ageText, 110],
    ['person-relationship', relationship, 126],
  ]) {
    nodes
      .filter(d => text(d))
      .append('text')
      .attr('class', className)
      .attr('x', left + textPadding())
      .attr('y', top + y)
      .attr('font-size', 11)
      .attr('fill', palette.text)
      .text(d => clipString(text(d), boxWidth - textPadding() - 10, 11))
  }

  const placeholders = nodes
    .filter(d => !imageUrl(d))
    .append('g')
    .attr('class', 'photo-placeholder')
    .attr('transform', `translate(${left + imgPadding}, ${-imgRadius})`)
  placeholders
    .append('circle')
    .attr('cx', imgRadius)
    .attr('cy', imgRadius)
    .attr('r', imgRadius)
    .attr('fill', palette.personBox)
  placeholders
    .append('path')
    .attr(
      'd',
      d => ({M: mdiFaceMan, F: mdiFaceWoman}[profile(d)?.sex] || mdiAccount)
    )
    .attr('transform', `translate(8,8) scale(${(imgRadius * 2 - 16) / 24})`)
    .attr('fill', palette.sex ? palette.text : 'currentColor')

  nodes
    .filter(d => imageUrl(d))
    .each(function (d) {
      imagePatternCount += 1
      const patternId = `person-card-image-${imagePatternCount}`
      const node = select(this)
      node
        .append('defs')
        .append('pattern')
        .attr('id', patternId)
        .attr('width', 1)
        .attr('height', 1)
        .append('image')
        .attr('width', 2 * imgRadius)
        .attr('height', 2 * imgRadius)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .attr('xlink:href', imageUrl(d))
      node
        .append('circle')
        .attr('r', imgRadius)
        .attr('cx', left + imgPadding + imgRadius)
        .attr('cy', 0)
        .attr('fill', `url(#${patternId})`)
    })
}

// Sets click and hover handling on each node of the selection, and adds the
// add person button in edit mode. Calling it again updates the nodes in place.
export function setPersonCardInteraction(
  nodes,
  {
    profile,
    handle,
    boxWidth = 190,
    boxHeight = 90,
    canEdit = false,
    palette = chartPalette,
  }
) {
  nodes
    .style('cursor', canEdit ? 'default' : 'pointer')
    .on('click', function (event, d) {
      const grampsId = profile(d)?.gramps_id
      if (!canEdit && grampsId) {
        fireEvent(this, 'pedigree:person-selected', {grampsId})
      }
    })
    .on('mouseenter', function (event, d) {
      const grampsId = profile(d)?.gramps_id
      if (canEdit || !grampsId || !isHoverDevice()) {
        return
      }
      fireEvent(window, 'object:preview-show', {
        objectType: 'person',
        grampsId,
        anchorRect: this.getBoundingClientRect(),
        chart: true,
      })
    })
    .on('mouseleave', () => {
      if (isHoverDevice()) {
        fireEvent(window, 'object:preview-hide')
      }
    })

  if (!canEdit) {
    nodes.selectAll('.add-person-btn').remove()
    return
  }
  // Selecting existing buttons passes them the current data of their node
  colorAddPersonButtons(nodes.select('.add-person-btn'), palette)
  appendAddPersonButton(
    nodes.filter(function () {
      return !this.querySelector('.add-person-btn')
    }),
    boxWidth / 2 - 14,
    -boxHeight / 2 + 14,
    handle,
    palette
  )
}

// The inputs each card was last drawn with
const cardInputs = local()

// Draws the card of each node whose person, image, name format or palette
// changed since its card was last drawn. The data of each node has a
// `person`, and each node has a `.person-card` group for the card.
export function drawChangedCards(
  nodes,
  {
    getImageUrl = () => '',
    relations = {},
    lang = 'en',
    ageLabel = 'Age',
    deathAgeLabel = 'Age at death',
    nameDisplayFormat,
    birthSymbol,
    deathSymbol,
    palette = chartPalette,
    boxWidth,
    boxHeight,
  }
) {
  const changed = new Set()
  nodes.each(function (d) {
    const inputs = {
      person: d.person,
      relationship: relations[d.person?.handle] || '',
      age: personAge(d.person),
      lang,
      ageLabel,
      deathAgeLabel,
      imageUrl: getImageUrl(d),
      nameDisplayFormat,
      birthSymbol,
      deathSymbol,
      palette,
    }
    const previous = cardInputs.get(this)
    cardInputs.set(this, inputs)
    if (
      !previous ||
      Object.keys(inputs).some(key => inputs[key] !== previous[key])
    ) {
      changed.add(this)
    }
  })
  const cards = nodes
    .filter(function () {
      return changed.has(this)
    })
    .select('.person-card')
  cards.selectChildren().remove()
  appendPersonCard(cards, {
    profile: d => d.person?.profile,
    person: d => d.person,
    relationship: d => relations[d.person?.handle] || '',
    ageText: d => {
      const age = personAge(d.person)
      if (age === null) return ''
      const label = d.person?.profile?.death?.date ? deathAgeLabel : ageLabel
      return `${label}: ${new Intl.NumberFormat(lang, {
        style: 'unit',
        unit: 'year',
        unitDisplay: 'long',
      }).format(age)}`
    },
    imageUrl: getImageUrl,
    boxWidth,
    boxHeight,
    nameDisplayFormat,
    birthSymbol,
    deathSymbol,
    palette,
  })
}

// Sets click and hover handling and add person buttons on nodes whose data
// have a `person` and a `handle`, or removes them without `interactive`
export function updatePersonCardInteraction(
  nodes,
  {
    interactive,
    canEdit,
    canEditPhoto = false,
    photoLabel = 'Add photo',
    editLabel = 'Basic details',
    palette = chartPalette,
    boxWidth,
    boxHeight,
  }
) {
  if (!interactive) {
    clearPersonCardInteraction(nodes)
    return
  }
  updatePhotoButtons(nodes, {
    canEditPhoto,
    photoLabel,
    editLabel,
    handle: d => d.person?.handle,
    boxWidth,
    boxHeight,
    palette,
  })
  setPersonCardInteraction(nodes, {
    profile: d => d.person?.profile,
    handle: d => d.handle,
    boxWidth,
    boxHeight,
    canEdit,
    palette,
  })
}

// Removes what `setPersonCardInteraction` added: click and hover handling,
// cursors and add person buttons
export function clearPersonCardInteraction(nodes) {
  nodes
    .style('cursor', null)
    .on('click mouseenter mouseleave', null)
    .selectAll(
      '.add-person-btn, .person-photo-button, .person-photo-target, .person-edit-button'
    )
    .remove()
}
